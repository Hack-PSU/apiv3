import { Body, Controller, Post, Patch, Param, ValidationPipe } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ApiDoc } from "common/docs";
import { Role } from "common/gcp";
import { ApplicantScoreService } from "./applicant-score.service";
import { BulkApplicantScoreDto, UpdatePrioritizedDto } from "./dto/applicant-score.dto";
import { ApplicantScoreEntity } from "entities/applicant-score.entity";

@ApiTags("Applicants")
@Controller("applicants")
export class ApplicantScoreController {
  constructor(private readonly applicantScoreService: ApplicantScoreService) {}

  @Post("/bulk")
  @ApiDoc({
    summary: "Overwrite all applicant scores",
    auth: Role.EXEC,
    response: {
      created: { type: [ApplicantScoreEntity] },
    },
  })
  async bulkUpload(
    @Body(new ValidationPipe({ transform: true })) body: BulkApplicantScoreDto,
  ) {
    return this.applicantScoreService.overwriteAll(body.scores);
  }

  @Patch("/:hackathonId/:userId/prioritized")
  @ApiDoc({
    summary: "Update prioritized status for an applicant score",
    auth: Role.EXEC,
    response: {
      ok: { type: ApplicantScoreEntity },
    },
  })
  async updatePrioritized(
    @Param("hackathonId") hackathonId: string,
    @Param("userId") userId: string,
    @Body(new ValidationPipe({ transform: true })) body: UpdatePrioritizedDto,
  ) {
    return this.applicantScoreService.updatePrioritized(
      userId,
      hackathonId,
      body.prioritized,
    );
  }
}