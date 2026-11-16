import { Module } from "@nestjs/common";
import { ObjectionModule } from "common/objection";
import { Finance } from "entities/finance.entity";
import { FinanceController } from "./finance.controller";
import { User } from "entities/user.entity";
import { Organizer } from "entities/organizer.entity";
import { Hackathon } from "entities/hackathon.entity";
import { FinanceService } from "./finance.service";
import { ConfigModule } from "@nestjs/config";
import { SendGridService } from "common/sendgrid";
import { FinanceScheduler } from "./finance.scheduler";

@Module({
  imports: [
    ObjectionModule.forFeature([Finance, User, Organizer, Hackathon]),
    ConfigModule,
  ],
  controllers: [FinanceController],
  providers: [FinanceService, SendGridService, FinanceScheduler],
})
export class FinanceModule {}
