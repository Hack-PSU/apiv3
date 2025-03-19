import { Module } from "@nestjs/common";
import { ObjectionModule } from "common/objection";
import { Registration } from "@entities/registration.entity";
import { RegistrationController } from "./registration.controller";

@Module({
  imports: [ObjectionModule.forFeature([Registration])],
  controllers: [RegistrationController],
})
export class RegistrationModule {}
