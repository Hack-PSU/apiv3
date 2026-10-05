import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { isAxiosError } from "axios";
import { google } from "googleapis";
import { AgentEngineConfig, ConfigToken } from "common/config";
import { ApplicantEvaluationInput } from "./applicant-evaluation-input.types";
import {
  buildScreeningMessage,
  toScreeningModelInput,
} from "./applicant-screening-input";
import {
  parseScreeningResult,
  ScreeningOutputError,
} from "./applicant-screening.parser";
import { ScreeningResult, ScreeningRubric } from "./applicant-screening.types";

// Agent Engine sessions are scoped to this ID, not to the applicant, so no
// applicant identifier is stored in session metadata.
const AGENT_USER_ID = "apiv3-applicant-screening";

/**
 * Extracts the agent's final text from an Agent Engine :streamQuery body.
 * The body is newline-delimited JSON ADK events, optionally with SSE `data:`
 * framing. The last event with text parts is the agent's answer.
 */
export function extractFinalText(body: string): string {
  let finalText: string | undefined;

  for (const rawLine of body.split("\n")) {
    const line = rawLine.replace(/^data:\s*/, "").trim();
    if (!line) continue;

    let event: any;
    try {
      event = JSON.parse(line);
    } catch {
      throw new ScreeningOutputError(
        "Agent Engine sent a non-JSON event",
        body,
      );
    }

    if (event.error_code || event.error_message) {
      throw new ScreeningOutputError(
        `Agent returned an error: ${event.error_code ?? ""} ${event.error_message ?? ""}`.trim(),
        body,
      );
    }

    const text = (event.content?.parts ?? [])
      .map((part: any) => part.text)
      .filter((part: unknown) => typeof part === "string")
      .join("");
    if (text) finalText = text;
  }

  if (finalText === undefined) {
    throw new ScreeningOutputError("Agent returned no text output", body);
  }
  return finalText;
}

@Injectable()
export class AgentEngineClient {
  private readonly logger = new Logger(AgentEngineClient.name);
  private readonly config: AgentEngineConfig;
  private readonly auth;

  constructor(
    private readonly httpService: HttpService,
    configService: ConfigService,
  ) {
    this.config = configService.get<AgentEngineConfig>(
      ConfigToken.AGENT_ENGINE,
    );

    // Same credential pattern as GoogleDriveService: a key file locally,
    // Application Default Credentials on Cloud Run.
    const keyFile = configService.get<string>("GOOGLE_CERT");
    this.auth = new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
      ...(keyFile ? { keyFile } : {}),
    });
  }

  private get queryUrl(): string {
    const { projectId, location, resourceId } = this.config ?? {};
    if (!projectId || !location || !resourceId) {
      throw new InternalServerErrorException(
        "Agent Engine is not configured. Set AGENT_ENGINE_PROJECT_ID, AGENT_ENGINE_LOCATION, and AGENT_ENGINE_RESOURCE_ID.",
      );
    }
    return `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/reasoningEngines/${resourceId}:streamQuery`;
  }

  /**
   * Scores one application against the rubric. Only the fields chosen by
   * toScreeningModelInput are sent to the model.
   */
  async screen(
    rubric: ScreeningRubric,
    application: ApplicantEvaluationInput,
  ): Promise<ScreeningResult> {
    const modelInput = toScreeningModelInput(application);
    const message = buildScreeningMessage(rubric, modelInput);
    const url = this.queryUrl;
    const token = await this.auth.getAccessToken();

    let body: string;
    try {
      const response = await this.httpService.axiosRef.post<string>(
        url,
        {
          class_method: "async_stream_query",
          input: { user_id: AGENT_USER_ID, message },
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: this.config.timeoutMs,
          responseType: "text",
        },
      );
      body = response.data;
    } catch (error) {
      if (
        isAxiosError(error) &&
        (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT")
      ) {
        this.logger.warn(
          `Screening timed out after ${this.config.timeoutMs}ms for ${modelInput.applicant_id}`,
        );
        throw new GatewayTimeoutException("Screening agent timed out");
      }
      this.logger.error(
        `Screening request failed for ${modelInput.applicant_id}`,
        isAxiosError(error) ? error.response?.data : error,
      );
      throw new BadGatewayException("Screening agent request failed");
    }

    try {
      return parseScreeningResult(extractFinalText(body), {
        applicantId: modelInput.applicant_id,
        criteria: rubric.criteria.map((criterion) => criterion.id),
      });
    } catch (error) {
      if (error instanceof ScreeningOutputError) {
        // Log the reason only; the raw output can quote applicant answers.
        this.logger.error(
          `Invalid screening output for ${modelInput.applicant_id}: ${error.message}`,
        );
        throw new BadGatewayException(
          "Screening agent returned invalid output",
        );
      }
      throw error;
    }
  }
}
