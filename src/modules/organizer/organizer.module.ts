import { Module } from "@nestjs/common";
import { ObjectionModule } from "common/objection";
import { Organizer } from "entities/organizer.entity";
import { OrganizerController } from "./organizer.controller";
import { OrganizerService } from "./organizer.service";
import { Score } from "entities/score.entity";

@Module({
  imports: [ObjectionModule.forFeature([Organizer, Score])],
  providers: [OrganizerService],
  controllers: [OrganizerController],
})
export class OrganizerModule {}
