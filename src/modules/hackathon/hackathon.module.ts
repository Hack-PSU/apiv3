import { Module } from "@nestjs/common";
import { ObjectionModule } from "common/objection";
import { Hackathon } from "@entities/hackathon.entity";
import { HackathonController } from "./hackathon.controller";
import { Event } from "@entities/event.entity";

@Module({
  imports: [ObjectionModule.forFeature([Hackathon, Event])],
  controllers: [HackathonController],
})
export class HackathonModule {}
