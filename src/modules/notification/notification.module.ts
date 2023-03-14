import { Module } from "@nestjs/common";
import { FirebaseMessagingModule } from "common/gcp/messaging";
import { NotificationController } from "modules/notification/notification.controller";

@Module({
  imports: [FirebaseMessagingModule],
  controllers: [NotificationController],
})
export class NotificationModule {}
