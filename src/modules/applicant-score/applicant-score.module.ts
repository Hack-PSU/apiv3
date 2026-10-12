import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ObjectionModule } from "common/objection";
import { ApplicantAiScore } from "entities/applicant-ai-score.entity";
import { ApplicantScore } from "entities/applicant-score.entity";
import { Registration } from "entities/registration.entity";
import { UserModule } from "modules/user/user.module";
import { ApplicantAiScoreController } from "./applicant-ai-score.controller";
import { ApplicantAiScoreScheduler } from "./applicant-ai-score.scheduler";
import { ApplicantAiScoreService } from "./applicant-ai-score.service";
import { ApplicantScoreController } from "./applicant-score.controller";
import { ApplicantScoreService } from "./applicant-score.service";
import { ApplicantEvaluationInputService } from "./applicant-evaluation-input.service";
import { VertexApplicantScoringService } from "./vertex-applicant-scoring.service";

@Module({
  imports: [
    ObjectionModule.forFeature([
      ApplicantScore,
      ApplicantAiScore,
      Registration,
    ]),
    ConfigModule,
    UserModule,
  ],
  controllers: [ApplicantScoreController, ApplicantAiScoreController],
  providers: [
    ApplicantScoreService,
    ApplicantEvaluationInputService,
    VertexApplicantScoringService,
    ApplicantAiScoreService,
    ApplicantAiScoreScheduler,
  ],
  exports: [ApplicantEvaluationInputService, ApplicantAiScoreService],
})
export class ApplicantScoreModule {}
