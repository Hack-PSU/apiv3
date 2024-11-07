import { Module } from "@nestjs/common";
import { ObjectionModule } from "common/objection";
import { Finance } from "entities/finance.entity";
import { FinanceController } from "./finance.controller";

@Module({
  imports: [ObjectionModule.forFeature([Finance])],
  controllers: [FinanceController],
})
export class FinanceModule {}
