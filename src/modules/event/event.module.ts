import { Module } from "@nestjs/common";
import { ObjectionModule } from "common/objection";
import { Event } from "entities/event.entity";
import { EventController } from "./event.controller";
import { EventService } from "modules/event/event.service";
import { Scan } from "entities/scan.entity";
import { FirebaseMessagingModule } from "common/gcp/messaging";
import { User } from "entities/user.entity";
import { Registration } from "entities/registration.entity";
import { GotifyModule } from "common/gotify/gotify.module";

@Module({
  imports: [
    ObjectionModule.forFeature([Event, Scan, User, Registration]),
    FirebaseMessagingModule,
    GotifyModule,
  ],
  providers: [EventService],
  controllers: [EventController],
})
export class EventModule {}
