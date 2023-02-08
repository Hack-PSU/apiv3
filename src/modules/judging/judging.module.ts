import { Module } from "@nestjs/common";
import { ProjectController } from "modules/judging/project.controller";
import { ObjectionModule } from "common/objection";
import { Project } from "entities/project.entity";
import { Score } from "entities/score.entity";
import { ScoreController } from "modules/judging/score.controller";

// TODO(susanto-tm): Add JudgingController for aggregated score breakdown

@Module({
  imports: [ObjectionModule.forFeature([Project, Score])],
  controllers: [ProjectController, ScoreController],
})
export class JudgingModule {}
