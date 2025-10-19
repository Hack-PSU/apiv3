import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { NotificationSchedulerService } from "./notification-scheduler.service";
import { GotifyModule } from "../../common/gotify/gotify.module";

@Module({
  imports: [ScheduleModule.forRoot(), GotifyModule],
  providers: [NotificationSchedulerService],
  exports: [NotificationSchedulerService],
})
export class NotificationSchedulerModule {}
