import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseFilters,
  ValidationPipe,
} from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { Score, ScoreEntity } from "entities/score.entity";
import {
  ApiExtraModels,
  ApiProperty,
  ApiTags,
  OmitType,
  PartialType,
} from "@nestjs/swagger";
import { OrganizerEntity } from "entities/organizer.entity";
import { ProjectEntity } from "entities/project.entity";
import { Role, Roles } from "common/gcp";
import { ApiDoc } from "common/docs";
import { IsBoolean, IsNumber, IsOptional } from "class-validator";
import { ControllerMethod } from "common/validation";
import { DBExceptionFilter } from "common/filters";

class ScoreCreateEntity extends ScoreEntity {
  @ApiProperty({ required: false, default: -1 })
  @IsOptional()
  @IsNumber()
  creativity: number;

  @ApiProperty({ required: false, default: -1 })
  @IsOptional()
  @IsNumber()
  technical: number;

  @ApiProperty({ required: false, default: -1 })
  @IsOptional()
  @IsNumber()
  implementation: number;

  @ApiProperty({ required: false, default: -1 })
  @IsOptional()
  @IsNumber()
  clarity: number;

  @ApiProperty({ required: false, default: -1 })
  @IsOptional()
  @IsNumber()
  growth: number;

  @ApiProperty({ required: false, default: -1 })
  @IsOptional()
  @IsNumber()
  energy: number;

  @ApiProperty({ required: false, default: -1 })
  @IsOptional()
  @IsNumber()
  supplyChain: number;

  @ApiProperty({ required: false, default: -1 })
  @IsOptional()
  @IsNumber()
  environmental: number;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  submitted: boolean;
}

class ScorePatchEntity extends PartialType(
  OmitType(ScoreEntity, ["projectId", "judgeId"] as const),
) {}

class ScoreUpdateEntity extends OmitType(ScoreEntity, [
  "projectId",
  "judgeId",
] as const) {}

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
@UseFilters(DBExceptionFilter)
@ApiExtraModels(ScoreResponseEntity)
export class ScoreController {
  constructor(
    @InjectRepository(Score)
    private readonly scoreRepo: Repository<Score>,
  ) {}

  @Get("/")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Get All Scores",
    query: [
      {
        name: "hackathonId",
        description: "A valid hackathon ID",
        required: false,
      },
    ],
    response: {
      ok: { type: [ScoreResponseEntity] },
    },
    auth: Role.TEAM,
  })
  async getAll(@Query("hackathonId") hackathonId?: string) {
    return this.scoreRepo
      .findAll()
      .byHackathon(hackathonId)
      .withGraphFetched("[project, judge]");
  }

  @Post("/")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Create a Score",
    request: {
      body: { type: ScoreCreateEntity },
      validate: true,
    },
    response: {
      created: { type: ScoreDataEntity },
    },
    auth: Role.TEAM,
  })
  async createOne(
    @Body(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        whitelist: true,
        transform: true,
        transformOptions: {
          groups: [ControllerMethod.POST],
        },
      }),
    )
    data: ScoreCreateEntity,
  ) {
    return this.scoreRepo.createOne(data).byHackathon(data.hackathonId);
  }

  @Get(":id")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Get a Score",
    params: [
      {
        name: "id",
        description: "ID must be set to a score's ID",
      },
    ],
    response: {
      ok: { type: ScoreResponseEntity },
    },
    auth: Role.TEAM,
  })
  async getOne(@Param("id", ParseIntPipe) id: number) {
    return this.scoreRepo
      .findOne(id)
      .raw()
      .withGraphFetched("[project, judge]");
  }

  @Patch(":id")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Patch a Score",
    params: [
      {
        name: "id",
        description: "ID must be set to a score's ID",
      },
    ],
    request: {
      body: { type: ScorePatchEntity },
      validate: true,
    },
    response: {
      ok: { type: ScoreResponseEntity },
    },
    auth: Role.TEAM,
  })
  async patchOne(
    @Param("id", ParseIntPipe) id: number,
    @Body(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        whitelist: true,
        transform: true,
      }),
    )
    data: ScorePatchEntity,
  ) {
    // projectId and judgeId is removed using ValidationPipe
    return this.scoreRepo
      .patchOne(id, data)
      .raw()
      .withGraphFetched("[project, judge]");
  }

  @Put(":id")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Replace a Score",
    params: [
      {
        name: "id",
        description: "ID must be set to a score's ID",
      },
    ],
    request: {
      body: { type: ScoreUpdateEntity },
      validate: true,
    },
    response: {
      ok: { type: ScoreResponseEntity },
    },
    auth: Role.TEAM,
  })
  async replaceOne(
    @Param("id", ParseIntPipe) id: number,
    @Body(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        whitelist: true,
        transform: true,
      }),
    )
    data: ScoreUpdateEntity,
  ) {
    const currentScore = await this.scoreRepo.findOne(id).exec();

    return this.scoreRepo
      .replaceOne(id, {
        ...data,
        judgeId: currentScore.judgeId,
        projectId: currentScore.projectId,
      })
      .raw()
      .withGraphFetched("[project, judge]");
  }

  @Delete(":id")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Delete a Score",
    params: [
      {
        name: "id",
        description: "ID must be set to a score's ID",
      },
    ],
    response: {
      noContent: true,
    },
    auth: Role.TEAM,
  })
  async deleteOne(@Param("id", ParseIntPipe) id: number) {
    return this.scoreRepo.deleteOne(id).exec();
  }
}
