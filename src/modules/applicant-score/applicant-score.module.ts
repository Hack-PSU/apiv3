import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ConfigModule } from "@nestjs/config";
import { ObjectionModule } from "common/objection";
import { ApplicantScore } from "entities/applicant-score.entity";
import { Registration } from "entities/registration.entity";
import { UserModule } from "modules/user/user.module";
import { ApplicantScoreController } from "./applicant-score.controller";
import { ApplicantScoreService } from "./applicant-score.service";
import { ApplicantEvaluationInputService } from "./applicant-evaluation-input.service";
import { AgentEngineClient } from "./agent-engine.client";

@Module({
  imports: [
    ObjectionModule.forFeature([ApplicantScore, Registration]),
    UserModule,
    HttpModule,
    ConfigModule,
  ],
  controllers: [ApplicantScoreController],
  providers: [
    ApplicantScoreService,
    ApplicantEvaluationInputService,
    AgentEngineClient,
  ],
  exports: [ApplicantEvaluationInputService, AgentEngineClient],
})
export class ApplicantScoreModule {}
