import { Module } from "@nestjs/common";
import { ObjectionModule } from "common/objection";
import { Registration } from "entities/registration.entity";
import { User } from "entities/user.entity";
import { RegistrationController } from "./registration.controller";
import { User } from "entities/user.entity";

@Module({
  imports: [ObjectionModule.forFeature([Registration, User])],
  controllers: [RegistrationController],
})
export class RegistrationModule {}
