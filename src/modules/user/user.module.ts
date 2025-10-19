import { Module } from "@nestjs/common";
import { ObjectionModule } from "common/objection";
import { User } from "entities/user.entity";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";
import { Scan } from "entities/scan.entity";
import { ExtraCreditAssignment } from "entities/extra-credit-assignment.entity";
import { ExtraCreditClass } from "entities/extra-credit-class.entity";
import { ConfigModule } from "@nestjs/config";
import { Registration } from "entities/registration.entity";
import { FirebaseMessagingModule } from "common/gcp/messaging";
import { Event } from "entities/event.entity";
import { GotifyModule } from "common/gotify/gotify.module";

@Module({
  imports: [
    ObjectionModule.forFeature([
      User,
      Event,
      Scan,
      ExtraCreditClass,
      ExtraCreditAssignment,
      Registration,
    ]),
    ConfigModule,
    FirebaseMessagingModule,
    GotifyModule,
  ],
  providers: [UserService],
  controllers: [UserController],
})
export class UserModule {}
