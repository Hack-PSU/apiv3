import { Module } from "@nestjs/common";
import { ObjectionModule } from "common/objection";
import { Registration } from "@entities/registration.entity";
import { User } from "@entities/user.entity";
import { Event } from "@entities/event.entity";
import { Scan } from "@entities/scan.entity";
import { Organizer } from "@entities/organizer.entity";
import { AnalyticsService } from "modules/analytics/analytics.service";
import { AnalyticsController } from "modules/analytics/analytics.controller";

@Module({
  imports: [
    ObjectionModule.forFeature([Registration, User, Event, Scan, Organizer]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
