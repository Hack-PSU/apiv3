import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import {
  ApplicantAiScore,
  ApplicantAiScoreStatus,
} from "entities/applicant-ai-score.entity";
import { Hackathon } from "entities/hackathon.entity";
import { ApplicationStatus, Registration } from "entities/registration.entity";
import { ApplicantEvaluationInputService } from "./applicant-evaluation-input.service";
import {
  APPLICANT_SCORING_PROMPT_VERSION,
  computeOverallScore,
} from "./applicant-scoring.prompt";
import {
  VertexApplicantScoringService,
  VertexScoringError,
} from "./vertex-applicant-scoring.service";

const MAX_ATTEMPTS = 3;
const CONCURRENCY = 3;
const MAX_CONSECUTIVE_FAILURES = 3;
const MAX_ERROR_LENGTH = 500;

export type ApplicantAiScoringRunSummary = {
  hackathonId: string | null;
  attempted: number;
  scored: number;
  failed: number;
  aborted: string | null;
};

@Injectable()
export class ApplicantAiScoreService {
  private readonly logger = new Logger(ApplicantAiScoreService.name);

  constructor(
    @InjectRepository(ApplicantAiScore)
    private readonly aiScoreRepo: Repository<ApplicantAiScore>,
    private readonly evaluationInputService: ApplicantEvaluationInputService,
    private readonly vertexScoringService: VertexApplicantScoringService,
  ) {}

  async findAll(hackathonId?: string): Promise<ApplicantAiScore[]> {
    const id = hackathonId ?? (await this.findActiveHackathonId());
    if (!id) {
      return [];
    }

    return await ApplicantAiScore.query()
      .where("hackathonId", id)
      .orderBy("score", "desc");
  }

  /**
   * Scores one applicant and stores the result. A failed attempt is stored
   * with its error but keeps any score from an earlier successful attempt.
   * Throws instead of storing anything when the registration does not exist
   * or when Vertex is misconfigured or throttled.
   */
  async scoreApplicant(
    hackathonId: string,
    userId: string,
  ): Promise<ApplicantAiScore> {
    const existing = await this.aiScoreRepo
      .findOne([hackathonId, userId])
      .exec();
    const base = {
      hackathonId,
      userId,
      model: this.vertexScoringService.model,
      promptVersion: APPLICANT_SCORING_PROMPT_VERSION,
      attempts: (existing?.attempts ?? 0) + 1,
      updatedAt: Date.now(),
    };

    let row: Partial<ApplicantAiScore>;
    try {
      const input = await this.evaluationInputService.build(
        hackathonId,
        userId,
      );
      const result = await this.vertexScoringService.score(input);
      row = {
        ...base,
        status: ApplicantAiScoreStatus.SCORED,
        score: computeOverallScore(result),
        effortScore: result.effort,
        motivationScore: result.motivation,
        projectScore: result.project,
        initiativeScore: result.initiative,
        summary: result.summary,
        error: null,
        scoredAt: Date.now(),
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        (error instanceof VertexScoringError && error.abortRun)
      ) {
        throw error;
      }

      const message = String(error?.message ?? "Unknown error").slice(
        0,
        MAX_ERROR_LENGTH,
      );
      this.logger.warn(
        `AI scoring failed for userId: ${userId}, hackathonId: ${hackathonId}: ${message}`,
      );

      if (existing?.status === ApplicantAiScoreStatus.SCORED) {
        await ApplicantAiScore.knex()("applicant_ai_scores")
          .where({ hackathonId, userId })
          .update({
            error: message,
            attempts: base.attempts,
            updatedAt: base.updatedAt,
          });
        return this.aiScoreRepo.findOne([hackathonId, userId]).exec();
      }

      row = { ...base, status: ApplicantAiScoreStatus.FAILED, error: message };
    }

    await ApplicantAiScore.knex()("applicant_ai_scores")
      .insert(row)
      .onConflict(["hackathon_id", "user_id"])
      .merge();

    return this.aiScoreRepo.findOne([hackathonId, userId]).exec();
  }

  /**
   * Scores pending and waitlisted applicants in the active hackathon that have
   * no score yet, or whose earlier attempts failed fewer than MAX_ATTEMPTS
   * times (any number of times with retryFailed). Stops starting new work once
   * timeBudgetMs has elapsed or after MAX_CONSECUTIVE_FAILURES in a row.
   */
  async scorePending(
    limit: number,
    timeBudgetMs: number,
    retryFailed = false,
  ): Promise<ApplicantAiScoringRunSummary> {
    const deadline = Date.now() + timeBudgetMs;
    const hackathonId = await this.findActiveHackathonId();
    const summary: ApplicantAiScoringRunSummary = {
      hackathonId,
      attempted: 0,
      scored: 0,
      failed: 0,
      aborted: null,
    };
    if (!hackathonId) {
      return summary;
    }

    const pending = await Registration.query()
      .select("registrations.userId")
      .leftJoin("applicant_ai_scores", (join) =>
        join
          .on("applicant_ai_scores.userId", "registrations.userId")
          .andOn(
            "applicant_ai_scores.hackathonId",
            "registrations.hackathonId",
          ),
      )
      .where("registrations.hackathonId", hackathonId)
      .whereIn("registrations.applicationStatus", [
        ApplicationStatus.PENDING,
        ApplicationStatus.WAITLISTED,
      ])
      .where((qb) =>
        qb
          .whereNull("applicant_ai_scores.userId")
          .orWhere((failed) => {
            failed.where(
              "applicant_ai_scores.status",
              ApplicantAiScoreStatus.FAILED,
            );
            if (!retryFailed) {
              failed.where("applicant_ai_scores.attempts", "<", MAX_ATTEMPTS);
            }
          }),
      )
      .orderBy("registrations.time", "asc")
      .limit(limit);

    let consecutiveFailures = 0;
    for (let i = 0; i < pending.length; i += CONCURRENCY) {
      if (summary.aborted || Date.now() > deadline) {
        break;
      }

      const batch = pending.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map(({ userId }) => this.scoreApplicant(hackathonId, userId)),
      );

      for (const result of results) {
        summary.attempted++;
        if (
          result.status === "fulfilled" &&
          result.value?.status === ApplicantAiScoreStatus.SCORED &&
          !result.value.error
        ) {
          summary.scored++;
          consecutiveFailures = 0;
          continue;
        }

        summary.failed++;
        consecutiveFailures++;
        if (
          result.status === "rejected" &&
          result.reason instanceof VertexScoringError
        ) {
          summary.aborted = result.reason.message;
        }
      }

      // A failure on every applicant usually means the request itself is
      // wrong, so stop before it uses up everyone's attempts.
      if (!summary.aborted && consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        summary.aborted = `${consecutiveFailures} consecutive failures`;
      }
    }

    if (summary.aborted) {
      this.logger.error(`AI scoring run aborted: ${summary.aborted}`);
    }
    return summary;
  }

  private async findActiveHackathonId(): Promise<string | null> {
    const hackathon = await Hackathon.query()
      .select("id")
      .where("active", true)
      .first();
    return hackathon?.id ?? null;
  }
}
