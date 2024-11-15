import { Module } from "@nestjs/common";
import { ObjectionModule } from "common/objection";
import { Finance } from "entities/finance.entity";
import { FinanceController } from "./finance.controller";
import { User } from "entities/user.entity";
import { Organizer } from "entities/organizer.entity";
import { Hackathon } from "entities/hackathon.entity";

@Module({
  imports: [ObjectionModule.forFeature([Finance, User, Organizer, Hackathon])],
  controllers: [FinanceController],
})
export class FinanceModule {}
