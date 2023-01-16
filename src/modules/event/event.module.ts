import { Module } from "@nestjs/common";
import { ObjectionModule } from "common/objection";
import { Event } from "entities/event.entity";
import { EventController } from "./event.controller";

@Module({
  imports: [ObjectionModule.forFeature([Event])],
  controllers: [EventController],
})
export class EventModule {}
