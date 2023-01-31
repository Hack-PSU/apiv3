import { Module } from "@nestjs/common";
import { FirebaseFirestoreModule } from "common/gcp/firestore";
import { FirestoreUser } from "entities/firestore-user.entity";
import { FirebaseMessagingService } from "./firebase-messaging.service";

@Module({
  imports: [
    FirebaseFirestoreModule.forFeature([
      {
        schema: FirestoreUser,
        collection: "users",
      },
    ]),
  ],
  providers: [FirebaseMessagingService],
  exports: [FirebaseMessagingService],
})
export class FirebaseMessagingModule {}
