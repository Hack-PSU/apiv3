import { Module } from "@nestjs/common";
import { ObjectionModule } from "common/objection";
import { Organizer } from "@entities/organizer.entity";
import { OrganizerController } from "./organizer.controller";
import { OrganizerService } from "./organizer.service";
import { Score } from "@entities/score.entity";
import { JudgingService } from "modules/judging/judging.service";
import { Project } from "@entities/project.entity";

@Module({
  imports: [ObjectionModule.forFeature([Organizer, Project, Score])],
  providers: [OrganizerService, JudgingService],
  controllers: [OrganizerController],
})
export class OrganizerModule {}
