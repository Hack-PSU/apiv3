import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { google } from "googleapis";
import { ApplicantEvaluationInput } from "./applicant-evaluation-input.types";
import {
  APPLICANT_SCORING_CRITERIA,
  APPLICANT_SCORING_RESPONSE_SCHEMA,
  APPLICANT_SCORING_SYSTEM_PROMPT,
  ApplicantScoringResult,
  buildApplicationPrompt,
} from "./applicant-scoring.prompt";

const DEFAULT_MODEL = "gemini-3.5-flash";
const DEFAULT_LOCATION = "global";
const DEFAULT_THINKING_LEVEL = "MEDIUM";
// Most requests finish in under 15 seconds, but a few stall indefinitely, so
// a stalled request is abandoned early and sent again.
const REQUEST_TIMEOUT_MS = 60 * 1000;
const MAX_REQUEST_ATTEMPTS = 2;
const MAX_ERROR_LENGTH = 500;

// Statuses that mean the integration itself is misconfigured or throttled, so
// retrying other applicants in the same run would fail the same way.
const ABORT_RUN_STATUSES = [401, 403, 404, 429];

type GenerateContentResponse = {
  candidates?: {
    content?: { parts?: { text?: string; thought?: boolean }[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
};

export class VertexScoringError extends Error {
  constructor(
    message: string,
    readonly abortRun = false,
  ) {
    super(message.slice(0, MAX_ERROR_LENGTH));
  }
}

@Injectable()
export class VertexApplicantScoringService {
  private readonly auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    ...(process.env.GOOGLE_CERT ? { keyFile: process.env.GOOGLE_CERT } : {}),
  });

  constructor(private readonly configService: ConfigService) {}

  get model(): string {
    return this.configService.get<string>("VERTEX_MODEL") || DEFAULT_MODEL;
  }

  private get thinkingLevel(): string {
    return (
      this.configService.get<string>("VERTEX_THINKING_LEVEL") ||
      DEFAULT_THINKING_LEVEL
    );
  }

  async score(
    input: ApplicantEvaluationInput,
  ): Promise<ApplicantScoringResult> {
    const parts: object[] = [{ text: buildApplicationPrompt(input) }];
    if (input.resume) {
      parts.push({
        inlineData: {
          mimeType: input.resume.mimeType,
          data: input.resume.base64Data,
        },
      });
    }

    const response = await this.generateContent({
      systemInstruction: { parts: [{ text: APPLICANT_SCORING_SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: APPLICANT_SCORING_RESPONSE_SCHEMA,
        thinkingConfig: { thinkingLevel: this.thinkingLevel },
      },
    });

    return parseScoringResult(response);
  }

  private async generateContent(
    body: object,
  ): Promise<GenerateContentResponse> {
    const location =
      this.configService.get<string>("VERTEX_LOCATION") || DEFAULT_LOCATION;
    const host =
      location === "global"
        ? "aiplatform.googleapis.com"
        : `${location}-aiplatform.googleapis.com`;

    let projectId: string;
    try {
      projectId =
        this.configService.get<string>("VERTEX_PROJECT_ID") ||
        (await this.auth.getProjectId());
      await this.auth.getAccessToken();
    } catch (error) {
      throw new VertexScoringError(
        `Vertex credentials unavailable: ${error?.message ?? "unknown error"}`,
        true,
      );
    }

    const url = `https://${host}/v1/projects/${projectId}/locations/${location}/publishers/google/models/${this.model}:generateContent`;

    // Request errors carry the request body, which contains application
    // answers and the resume, so only their status and the API's own message
    // are kept.
    for (let attempt = 1; ; attempt++) {
      try {
        const response = await this.auth.request<GenerateContentResponse>({
          url,
          method: "POST",
          data: body,
          timeout: REQUEST_TIMEOUT_MS,
          // Vertex's shared quota returns occasional 429s even at low volume.
          retryConfig: {
            retry: 2,
            retryDelay: 5000,
            httpMethodsToRetry: ["POST"],
            statusCodesToRetry: [
              [429, 429],
              [500, 599],
            ],
          },
        });
        return response.data;
      } catch (error) {
        const status: number | undefined =
          error?.response?.status ?? error?.status;
        const apiMessage: string | undefined =
          error?.response?.data?.error?.message;

        if (status) {
          throw new VertexScoringError(
            `Vertex request failed (${status})${apiMessage ? `: ${apiMessage}` : ""}`,
            ABORT_RUN_STATUSES.includes(status),
          );
        }
        // No status means a timeout or network error. The client does not
        // retry those itself, and they only fail this applicant.
        if (attempt >= MAX_REQUEST_ATTEMPTS) {
          throw new VertexScoringError(
            `Vertex request failed after ${attempt} attempts: ${error?.message ?? "unknown error"}`,
          );
        }
      }
    }
  }
}

function parseScoringResult(
  response: GenerateContentResponse,
): ApplicantScoringResult {
  const candidate = response?.candidates?.[0];
  if (!candidate) {
    const blockReason = response?.promptFeedback?.blockReason;
    throw new VertexScoringError(
      `Vertex returned no candidates${blockReason ? ` (blocked: ${blockReason})` : ""}`,
    );
  }

  const text = (candidate.content?.parts ?? [])
    .filter((part) => !part.thought && part.text)
    .map((part) => part.text)
    .join("");
  if (!text) {
    throw new VertexScoringError(
      `Vertex returned no text (finishReason: ${candidate.finishReason ?? "unknown"})`,
    );
  }

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new VertexScoringError("Vertex returned invalid JSON");
  }

  for (const criterion of APPLICANT_SCORING_CRITERIA) {
    const value = parsed?.[criterion];
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      throw new VertexScoringError(`Vertex returned an invalid ${criterion}`);
    }
  }
  if (typeof parsed.summary !== "string") {
    throw new VertexScoringError("Vertex returned an invalid summary");
  }

  return {
    effort: parsed.effort,
    motivation: parsed.motivation,
    project: parsed.project,
    initiative: parsed.initiative,
    summary: parsed.summary.trim().slice(0, 2000),
  };
}
