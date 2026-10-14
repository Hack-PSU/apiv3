import { Module } from "@nestjs/common";
import { ObjectionModule } from "common/objection";
import { ApplicantScore } from "entities/applicant-score.entity";
import { Registration } from "entities/registration.entity";
import { UserModule } from "modules/user/user.module";
import { ApplicantScoreController } from "./applicant-score.controller";
import { ApplicantScoreService } from "./applicant-score.service";
import { ApplicantEvaluationInputService } from "./applicant-evaluation-input.service";

@Module({
  imports: [
    ObjectionModule.forFeature([ApplicantScore, Registration]),
    UserModule,
  ],
  controllers: [ApplicantScoreController],
  providers: [ApplicantScoreService, ApplicantEvaluationInputService],
  exports: [ApplicantEvaluationInputService],
})
export class ApplicantScoreModule {}
