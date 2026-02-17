import { Body, Controller, Post, ValidationPipe } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ApiDoc } from "common/docs";
import { Role } from "common/gcp";
import { ApplicantScoreService } from "./applicant-score.service";
import { BulkApplicantScoreDto } from "./dto/applicant-score.dto";
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
}