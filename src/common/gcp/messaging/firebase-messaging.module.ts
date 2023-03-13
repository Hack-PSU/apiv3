import { Module } from "@nestjs/common";
import { FirebaseMessagingService } from "./firebase-messaging.service";

@Module({
  providers: [FirebaseMessagingService],
  exports: [FirebaseMessagingService],
})
export class FirebaseMessagingModule {}
