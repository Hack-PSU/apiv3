import { Module } from "@nestjs/common";
import { ProjectController } from "modules/judging/project.controller";
import { ObjectionModule } from "common/objection";
import { Project } from "@entities/project.entity";
import { Score } from "@entities/score.entity";
import { ScoreController } from "modules/judging/score.controller";
import { JudgingController } from "modules/judging/judging.controller";
import { JudgingService } from "modules/judging/judging.service";
import { Organizer } from "@entities/organizer.entity";
import { Hackathon } from "@entities/hackathon.entity";

@Module({
  imports: [ObjectionModule.forFeature([Organizer, Project, Score, Hackathon])],
  controllers: [JudgingController, ProjectController, ScoreController],
  providers: [JudgingService],
})
export class JudgingModule {}
