import { Module } from "@nestjs/common";
import { ObjectionModule } from "common/objection";
import { ApplicantScore } from "entities/applicant-score.entity";
import { ApplicantScoreController } from "./applicant-score.controller";
import { ApplicantScoreService } from "./applicant-score.service";

@Module({
  imports: [ObjectionModule.forFeature([ApplicantScore])],
  controllers: [ApplicantScoreController],
  providers: [ApplicantScoreService],
})
export class ApplicantScoreModule {}