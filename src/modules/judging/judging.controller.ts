import { Controller, Get } from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { Project, ProjectEntity } from "entities/project.entity";
import { Score, ScoreEntity } from "entities/score.entity";
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
  OmitType,
} from "@nestjs/swagger";
import { ApiAuth } from "common/docs/api-auth.decorator";
import { Role, Roles } from "common/gcp";
import { OrganizerEntity } from "entities/organizer.entity";
import { ApiDoc } from "common/docs";

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

class ProjectBreakdownEntity extends OmitType(ProjectEntity, [
  "name",
] as const) {
  @ApiProperty({ description: "The project's name" })
  name: string;

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
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Get Score Breakdowns By Project",
    response: {
      ok: { type: [ProjectBreakdownEntity] },
    },
    auth: Role.TEAM,
  })
  async getBreakdown() {
    // withGraphJoined creates a single join query allowing for modifiers
    // to be applied unlike withGraphFetched, which generates more than 1 query
    return this.projectRepo
      .findAll()
      .byHackathon()
      .withGraphJoined("scores(agg).judge")
      .modify("scoreAvg");
  }
}
