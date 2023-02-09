import { Controller, Get } from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { Project, ProjectEntity } from "entities/project.entity";
import { Score, ScoreEntity } from "entities/score.entity";
import * as _ from "lodash";
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
  OmitType,
} from "@nestjs/swagger";
import { ApiAuth } from "common/docs/api-auth";
import { Role } from "common/gcp";
import { OrganizerEntity } from "entities/organizer.entity";

class ScoreBreakdownJudgeEntity extends OmitType(OrganizerEntity, [
  "privilege",
] as const) {}

class ScoreBreakdownEntity extends OmitType(ScoreEntity, [
  "judgeId",
  "hackathonId",
  "projectId",
] as const) {
  @ApiProperty()
  total: number;

  @ApiProperty({ type: ScoreBreakdownJudgeEntity })
  judge: ScoreBreakdownJudgeEntity;
}

class ProjectBreakdownEntity extends ProjectEntity {
  @ApiProperty()
  average: number;

  @ApiProperty({ type: [ScoreBreakdownEntity] })
  scores: ScoreBreakdownEntity[];
}

@ApiTags("Judging")
@Controller("judging")
@ApiExtraModels(ProjectBreakdownEntity)
export class JudgingController {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(Score)
    private readonly scoreRepo: Repository<Score>,
  ) {}

  @Get("/breakdown")
  @ApiOperation({ summary: "Get Project and Score Breakdown" })
  @ApiOkResponse({ type: [ProjectBreakdownEntity] })
  @ApiAuth(Role.TEAM)
  async getBreakdown() {
    const projects = await this.projectRepo
      .findAll()
      .byHackathon()
      .withGraphFetched("scores(agg).judge");

    return projects.map((project) => ({
      ...project,
      average: _.meanBy(project.scores, (score: any) => score.total),
    }));
  }
}
