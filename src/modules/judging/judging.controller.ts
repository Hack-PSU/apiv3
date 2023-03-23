import { Controller, Get, UseFilters } from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { Project, ProjectEntity } from "entities/project.entity";
import { Score, ScoreEntity } from "entities/score.entity";
import {
  ApiExtraModels,
  ApiProperty,
  ApiTags,
  OmitType,
} from "@nestjs/swagger";
import { Role, Roles } from "common/gcp";
import { OrganizerEntity } from "entities/organizer.entity";
import { ApiDoc } from "common/docs";
import { DBExceptionFilter } from "common/filters";
import * as _ from "lodash";

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

  @ApiProperty({ description: "Average over total scores per judge" })
  average: number;

  @ApiProperty({ description: "Average creativity score" })
  creativity: number;

  @ApiProperty({ description: "Average implementation score" })
  implementation: number;

  @ApiProperty({ description: "Average clarity score" })
  clarity: number;

  @ApiProperty({ description: "Average growth score" })
  growth: number;

  @ApiProperty({ description: "Average technical score" })
  technical: number;

  @ApiProperty({ description: "Average energy score" })
  energy: number;

  @ApiProperty({ description: "Average supply chain score" })
  supplyChain: number;

  @ApiProperty({ description: "Average environmental score" })
  environmental: number;

  @ApiProperty({ type: [ScoreBreakdownEntity] })
  scores: ScoreBreakdownEntity[];
}

@ApiTags("Judging")
@Controller("judging")
@UseFilters(DBExceptionFilter)
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
    const projectBreakdown = await this.projectRepo
      .findAll()
      .byHackathon()
      .withGraphJoined("scores(agg).judge");

    return projectBreakdown.map((project) => {
      const creativity = _.meanBy(project.scores, "creativity");
      const implementation = _.meanBy(project.scores, "implementation");
      const clarity = _.meanBy(project.scores, "clarity");
      const growth = _.meanBy(project.scores, "growth");
      const technical = _.meanBy(project.scores, "technical");
      const energy = _.meanBy(project.scores, "energy");
      const supplyChain = _.meanBy(project.scores, "supplyChain");
      const environmental = _.meanBy(project.scores, "environmental");

      const average = _.meanBy(project.scores, "total");

      return {
        ...project,
        creativity,
        implementation,
        clarity,
        growth,
        technical,
        energy,
        supplyChain,
        environmental,
        average,
      };
    });
  }
}
