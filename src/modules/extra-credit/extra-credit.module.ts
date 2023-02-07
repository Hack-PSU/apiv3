import { Module } from "@nestjs/common";
import { ObjectionModule } from "common/objection";
import { ExtraCreditClass } from "entities/extra-credit-class.entity";
import { ExtraCreditAssignment } from "entities/extra-credit-assignment.entity";
import { ExtraCreditClassController } from "./extra-credit-class.controller";
import { ExtraCreditAssignmentController } from "./extra-credit-assignment.controller";

@Module({
  imports: [
    ObjectionModule.forFeature([ExtraCreditClass, ExtraCreditAssignment]),
  ],
  controllers: [ExtraCreditClassController, ExtraCreditAssignmentController],
})
export class ExtraCreditModule {}
