import { Module } from "@nestjs/common";
import { ObjectionModule } from "common/objection";
import { Scan } from "entities/scan.entity";
import { ScanController } from "modules/scan/scan.controller";
import { Event } from "entities/event.entity";
import { Organizer } from "entities/organizer.entity";

@Module({
  imports: [ObjectionModule.forFeature([Scan, Event, Organizer])],
  controllers: [ScanController],
})
export class ScanModule {}
