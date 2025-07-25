import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseFilters,
  ValidationPipe,
} from "@nestjs/common";
import {
  ApiExtraModels,
  ApiProperty,
  ApiTags,
  OmitType,
} from "@nestjs/swagger";
import { IsNumber, IsString } from "class-validator";
import { ApiDoc } from "common/docs";
import { DBExceptionFilter } from "common/filters";
import { Role, Roles } from "common/gcp";
import { InjectRepository, Repository } from "common/objection";
import { OrganizerEntity } from "entities/organizer.entity";
import { Project, ProjectEntity } from "entities/project.entity";
import { Score, ScoreEntity } from "entities/score.entity";
import * as _ from "lodash";
import { JudgingService } from "modules/judging/judging.service";

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

  @ApiProperty({ description: "Average challenge 1 score" })
  challenge1: number;

  @ApiProperty({ description: "Average challenge 2 score" })
  challenge2: number;

  @ApiProperty({ description: "Average challenge 3 score" })
  challenge3: number;

  @ApiProperty({ type: [ScoreBreakdownEntity] })
  scores: ScoreBreakdownEntity[];
}

class JudgingAssignmentEntity {
  @ApiProperty()
  @IsString({ each: true })
  users: string[];

  @ApiProperty()
  @IsNumber({}, { each: true })
  projects: number[];

  @ApiProperty()
  @IsNumber()
  projectsPerUser: number;
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
    private readonly judgingService: JudgingService,
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
      .where("submitted", true)
      .withGraphJoined("scores(agg).judge");

    return _.chain(projectBreakdown)
      .filter((project) => project.scores.length > 0)
      .map((project) => {
        const creativity = _.meanBy(project.scores, "creativity");
        const implementation = _.meanBy(project.scores, "implementation");
        const clarity = _.meanBy(project.scores, "clarity");
        const growth = _.meanBy(project.scores, "growth");
        const technical = _.meanBy(project.scores, "technical");
        const challenge1 = _.meanBy(project.scores, "challenge1");
        const challenge2 = _.meanBy(project.scores, "challenge2");
        const challenge3 = _.meanBy(project.scores, "challenge3");

        const average = _.meanBy(project.scores, "total");

        return {
          ...project,
          creativity,
          implementation,
          clarity,
          growth,
          technical,
          challenge1,
          challenge2,
          challenge3,
          average,
        };
      })
      .value();
  }

  @Post("/assign")
  @Roles(Role.EXEC)
  async assignJudging(
    @Body(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        whitelist: true,
        transform: true,
      }),
    )
    data: JudgingAssignmentEntity,
  ) {
    try {
      // Call the new assignment method.
      const assignments = await this.judgingService.createAssignmentsByCategory(
        data.users,
        data.projectsPerUser,
      );

      // Create Score entries for each assignment.
      for (const assignment of assignments) {
        await this.scoreRepo
          .createOne({
            projectId: assignment.projectId,
            judgeId: assignment.judgeId,
            hackathonId: assignment.hackathonId,
          })
          .exec();
      }

      return { message: "Assignments created", assignments };
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  // Route to assign additional projects to judges
  @Post("/assign/:judgeId")
  @Roles(Role.TEAM)
  async assignAdditionalProjects(@Param("judgeId") judgeId: string) {
    try {
      // Call the new assignment method.
      const assignment =
        await this.judgingService.getNewJudgingAssignment(judgeId);

      if (!assignment) {
        throw new Error("No projects available for assignment.");
      }

      // Create Score entries for each assignment.
      this.scoreRepo
        .createOne({
          projectId: assignment.projectId,
          judgeId: assignment.judgeId,
          hackathonId: assignment.hackathonId,
        })
        .exec();

      return { message: "Assignments created", assignment };
    } catch (e) {
      console.error(e);
      throw e;
    }
  }
}
