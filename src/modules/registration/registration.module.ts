import { Module } from "@nestjs/common";
import { ObjectionModule } from "common/objection";
import { Registration } from "entities/registration.entity";
import { User } from "entities/user.entity";
import { Hackathon } from "entities/hackathon.entity";
import { RegistrationController } from "./registration.controller";

@Module({
  imports: [ObjectionModule.forFeature([Registration, User, Hackathon])],
  controllers: [RegistrationController],
})
export class RegistrationModule {}