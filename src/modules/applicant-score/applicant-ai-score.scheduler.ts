import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CronExpression } from "@nestjs/schedule";
import { DistributedCron } from "common/gcp/scheduler";
import { ApplicantAiScoreService } from "./applicant-ai-score.service";

const BATCH_SIZE = 60;
// Kept below the lock TTL, leaving room for the slowest in-flight request.
const TIME_BUDGET_MS = 9 * 60 * 1000;

@Injectable()
export class ApplicantAiScoreScheduler {
  private readonly logger = new Logger(ApplicantAiScoreScheduler.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly aiScoreService: ApplicantAiScoreService,
  ) {}

  @DistributedCron(
    "applicant_ai_scoring_cron",
    CronExpression.EVERY_10_MINUTES,
    { lockTtlMs: 15 * 60 * 1000 },
  )
  async scorePendingApplicants() {
    if (this.configService.get<string>("ATS_AUTO_SCORING") !== "true") {
      return;
    }

    const summary = await this.aiScoreService.scorePending(
      BATCH_SIZE,
      TIME_BUDGET_MS,
    );
    if (summary.attempted > 0) {
      this.logger.log(
        `AI scoring run: ${summary.scored} scored, ${summary.failed} failed`,
      );
    }
  }
}
