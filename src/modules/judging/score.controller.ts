import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from "@nestjs/common";
import { Column, InjectRepository, Repository } from "common/objection";
import { Score, ScoreEntity } from "entities/score.entity";
import {
  ApiBody,
  ApiExtraModels,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiTags,
  OmitType,
  PartialType,
} from "@nestjs/swagger";
import { OrganizerEntity } from "entities/organizer.entity";
import { ProjectEntity } from "entities/project.entity";
import { ApiAuth } from "common/docs/api-auth";
import { Role } from "common/gcp";

class ScoreCreateEntity extends OmitType(ScoreEntity, ["id"] as const) {
  @ApiProperty({ required: false, default: -1 })
  creativity: number;

  @ApiProperty({ required: false, default: -1 })
  technical: number;

  @ApiProperty({ required: false, default: -1 })
  implementation: number;

  @ApiProperty({ required: false, default: -1 })
  clarity: number;

  @ApiProperty({ required: false, default: -1 })
  growth: number;

  @ApiProperty({ required: false, default: -1 })
  energy: number;

  @ApiProperty({ required: false, default: -1 })
  supplyChain: number;

  @ApiProperty({ required: false, default: -1 })
  environmental: number;
}

class ScorePatchEntity extends PartialType(
  OmitType(ScoreEntity, ["id"] as const),
) {}

class ScoreJudgeEntity extends OmitType(OrganizerEntity, [
  "privilege",
] as const) {}

class ScoreProjectEntity extends OmitType(ProjectEntity, [
  "hackathonId",
] as const) {}

class ScoreDataEntity extends OmitType(ScoreEntity, [
  "hackathonId",
  "judgeId",
  "projectId",
] as const) {}

class ScoreResponseEntity extends ScoreDataEntity {
  @ApiProperty({ type: ScoreJudgeEntity })
  judge: ScoreJudgeEntity;

  @ApiProperty({ type: ScoreProjectEntity })
  project: ScoreProjectEntity;
}

@ApiTags("Judging")
@Controller("judging/scores")
@ApiExtraModels(ScoreResponseEntity)
export class ScoreController {
  constructor(
    @InjectRepository(Score)
    private readonly scoreRepo: Repository<Score>,
  ) {}

  @Get("/")
  @ApiOperation({ summary: "Get All Scores" })
  @ApiOkResponse({ type: [ScoreResponseEntity] })
  @ApiAuth(Role.TEAM)
  async getAll(): Promise<Score[]> {
    return this.scoreRepo
      .findAll()
      .byHackathon()
      .withGraphFetched("[project, judge]");
  }

  @Post("/")
  @ApiOperation({ summary: "Create a Score" })
  @ApiBody({ type: ScoreCreateEntity })
  @ApiOkResponse({ type: ScoreDataEntity })
  @ApiAuth(Role.TEAM)
  async createOne(@Body() data: ScoreCreateEntity) {
    return this.scoreRepo.createOne(data).byHackathon();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a Score" })
  @ApiParam({ name: "id", description: "ID must be set to a score's ID" })
  @ApiOkResponse({ type: ScoreResponseEntity })
  @ApiAuth(Role.TEAM)
  async getOne(@Param("id") id: number) {
    return this.scoreRepo
      .findOne(id)
      .raw()
      .withGraphFetched("[project, judge]");
  }

  @Patch(":id")
  @ApiOperation({ summary: "Patch a Score" })
  @ApiParam({ name: "id", description: "ID must be set to a score's ID" })
  @ApiBody({ type: ScorePatchEntity })
  @ApiOkResponse({ type: ScoreResponseEntity })
  @ApiAuth(Role.TEAM)
  async patchOne(@Param("id") id: number, @Body() data: ScorePatchEntity) {
    const { projectId, judgeId, ...rest } = data;
    return this.scoreRepo
      .patchOne(id, rest)
      .raw()
      .withGraphFetched("[project, judge]");
  }

  @Put(":id")
  @ApiOperation({ summary: "Replace a Score" })
  @ApiParam({ name: "id", description: "ID must be set to a score's ID" })
  @ApiBody({ type: ScoreCreateEntity })
  @ApiOkResponse({ type: ScoreResponseEntity })
  @ApiAuth(Role.TEAM)
  async replaceOne(@Param("id") id: number, @Body() data: ScoreCreateEntity) {
    const { judgeId, projectId, ...rest } = data;

    const currentScore = await this.scoreRepo.findOne(id).exec();

    return this.scoreRepo
      .replaceOne(id, {
        ...rest,
        judgeId: currentScore.judgeId,
        projectId: currentScore.projectId,
      })
      .raw()
      .withGraphFetched("[project, judge]");
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a Score" })
  @ApiParam({ name: "id", description: "ID must be set to a score's ID" })
  @ApiNoContentResponse()
  @ApiAuth(Role.TEAM)
  async deleteOne(@Param("id") id: number) {
    return this.scoreRepo.deleteOne(id).exec();
  }
}
