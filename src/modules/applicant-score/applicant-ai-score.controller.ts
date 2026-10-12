import {
  Controller,
  DefaultValuePipe,
  Get,
  HttpException,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { Role, Roles } from "common/gcp";
import { ApplicantAiScoreService } from "./applicant-ai-score.service";
import { VertexScoringError } from "./vertex-applicant-scoring.service";

const MAX_RUN_LIMIT = 50;
// Cloud Run cuts requests off at 5 minutes by default.
const RUN_TIME_BUDGET_MS = 3 * 60 * 1000;

@ApiExcludeController()
@Controller("applicants/ai-scores")
export class ApplicantAiScoreController {
  constructor(private readonly aiScoreService: ApplicantAiScoreService) {}

  @Get("/")
  @Roles(Role.EXEC)
  async getAll(@Query("hackathonId") hackathonId?: string) {
    return this.aiScoreService.findAll(hackathonId);
  }

  @Post("/run")
  @Roles(Role.EXEC)
  async run(
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query("retryFailed") retryFailed?: string,
  ) {
    const clamped = Math.min(Math.max(limit, 1), MAX_RUN_LIMIT);
    return this.aiScoreService.scorePending(
      clamped,
      RUN_TIME_BUDGET_MS,
      retryFailed === "true",
    );
  }

  @Post("/:hackathonId/:userId")
  @Roles(Role.EXEC)
  async scoreOne(
    @Param("hackathonId") hackathonId: string,
    @Param("userId") userId: string,
  ) {
    try {
      return await this.aiScoreService.scoreApplicant(hackathonId, userId);
    } catch (error) {
      if (error instanceof VertexScoringError) {
        throw new HttpException(error.message, HttpStatus.SERVICE_UNAVAILABLE);
      }
      throw error;
    }
  }
}
