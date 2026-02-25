import { Module } from "@nestjs/common";
import { ObjectionModule } from "common/objection";
import { Registration } from "entities/registration.entity";
import { User } from "entities/user.entity";
import { Hackathon } from "entities/hackathon.entity";
import { ApplicantScore } from "entities/applicant-score.entity";
import { RegistrationController } from "./registration.controller";
import { RegistrationScheduler } from "./registration.scheduler";

@Module({
  imports: [ObjectionModule.forFeature([Registration, User, Hackathon, ApplicantScore])],
  controllers: [RegistrationController],
  providers: [RegistrationScheduler],
})
export class RegistrationModule {}