import { Module } from "@nestjs/common";
import { ObjectionModule } from "common/objection";
import { Hackathon } from "entities/hackathon.entity";
import { HackathonController } from "./hackathon.controller";
import { Event } from "entities/event.entity";
import { Organizer } from "entities/organizer.entity";
import { GoogleDriveModule } from "common/gcp/drive";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [
    ObjectionModule.forFeature([Hackathon, Event, Organizer]),
    GoogleDriveModule,
    ConfigModule,
  ],
  controllers: [HackathonController],
})
export class HackathonModule {}
