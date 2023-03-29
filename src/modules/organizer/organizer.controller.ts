import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UseFilters,
  ValidationPipe,
} from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { Organizer, OrganizerEntity } from "entities/organizer.entity";
import { SocketGateway } from "modules/socket/socket.gateway";
import { ApiProperty, ApiTags, OmitType, PartialType } from "@nestjs/swagger";
import { FirebaseAuthService, RestrictedRoles, Role, Roles } from "common/gcp";
import { take, toArray } from "rxjs";
import { OrganizerService } from "modules/organizer/organizer.service";
import { SocketRoom } from "common/socket";
import { ControllerMethod } from "common/validation";
import { ApiDoc } from "common/docs";
import { DBExceptionFilter } from "common/filters";
import { Project, ProjectEntity } from "entities/project.entity";
import { Score, ScoreEntity } from "entities/score.entity";

class OrganizerCreateEntity extends OrganizerEntity {}

class OrganizerReplaceEntity extends OmitType(OrganizerCreateEntity, [
  "id",
] as const) {}

class OrganizerUpdateEntity extends PartialType(OrganizerReplaceEntity) {}

class ScoreDataEntity extends OmitType(ScoreEntity, [
  "hackathonId",
  "judgeId",
  "projectId",
] as const) {}

class OrganizerUpdateScoreEntity extends PartialType(
  OmitType(ScoreDataEntity, ["id"] as const),
) {}

class ProjectScoreEntity extends OmitType(ProjectEntity, ["hackathonId"]) {
  @ApiProperty({ type: ScoreDataEntity })
  score: ScoreDataEntity;
}

@ApiTags("Organizers")
@Controller("organizers")
@UseFilters(DBExceptionFilter)
export class OrganizerController {
  constructor(
    @InjectRepository(Organizer)
    private readonly organizerRepo: Repository<Organizer>,
    @InjectRepository(Score)
    private readonly scoreRepo: Repository<Score>,
    private readonly socket: SocketGateway,
    private readonly auth: FirebaseAuthService,
    private readonly organizerService: OrganizerService,
  ) {}

  @Get("/")
  @Roles(Role.EXEC)
  @ApiDoc({
    summary: "Get All Organizers",
    response: {
      ok: { type: OrganizerEntity },
    },
    auth: Role.EXEC,
  })
  async getAll() {
    const organizers = await this.organizerRepo.findAll().exec();

    return this.organizerService.injectUserRoles(organizers).pipe(toArray());
  }

  @Post("/")
  @Roles(Role.EXEC)
  @ApiDoc({
    summary: "Create an Organizer",
    request: {
      body: { type: OrganizerCreateEntity },
      validate: true,
    },
    response: {
      created: { type: OrganizerEntity },
    },
    auth: Role.EXEC,
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
    data: OrganizerCreateEntity,
  ) {
    const userExists = await this.auth.validateUser(data.id);

    if (!userExists) {
      throw new HttpException("user not found", HttpStatus.BAD_REQUEST);
    }

    const { privilege, ...user } = data;

    const organizer = await this.organizerRepo.createOne(user).exec();

    await this.auth.updateUserClaims(data.id, privilege);
    this.socket.emit("create:organizer", organizer, SocketRoom.ADMIN);

    return organizer;
  }

  @Get(":id")
  @RestrictedRoles({
    roles: [Role.TEAM],
    predicate: (req) => req.user && req.user.sub === req.params.id,
  })
  @Roles(Role.EXEC)
  @ApiDoc({
    summary: "Get an Organizer",
    auth: Role.TEAM,
    restricted: true,
    params: [
      { name: "id", description: "ID must be set to an organizer's ID" },
    ],
    response: {
      ok: { type: OrganizerEntity },
    },
  })
  async getOne(@Param("id") id: string) {
    const organizer = await this.organizerRepo.findOne(id).exec();

    return this.organizerService.injectUserRoles([organizer]).pipe(take(1));
  }

  @Patch(":id")
  @Roles(Role.EXEC)
  @ApiDoc({
    summary: "Patch an Organizer",
    params: [
      {
        name: "id",
        description: "ID must be set to an organizer's ID",
      },
    ],
    request: {
      body: { type: OrganizerUpdateEntity },
      validate: true,
    },
    response: {
      ok: { type: OrganizerEntity },
    },
    auth: Role.EXEC,
  })
  async patchOne(
    @Param("id") id: string,
    @Body(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        whitelist: true,
        transform: true,
        transformOptions: {
          exposeUnsetFields: false,
        },
      }),
    )
    data: OrganizerUpdateEntity,
  ) {
    const { privilege, ...rest } = data;
    const organizer = await this.organizerRepo.patchOne(id, rest).exec();

    if (privilege) {
      await this.auth.updateUserClaims(id, privilege);
    }

    this.socket.emit("update:organizer", organizer, SocketRoom.ADMIN);

    return this.organizerService.injectUserRoles([organizer]).pipe(take(1));
  }

  @Put(":id")
  @Roles(Role.EXEC)
  @ApiDoc({
    summary: "Replace an Organizer",
    params: [
      {
        name: "id",
        description: "ID must be set to an organizer's ID",
      },
    ],
    request: {
      body: { type: OrganizerReplaceEntity },
      validate: true,
    },
    response: {
      ok: { type: OrganizerEntity },
    },
    auth: Role.EXEC,
  })
  async replaceOne(
    @Param("id") id: string,
    @Body(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        whitelist: true,
        transform: true,
      }),
    )
    data: OrganizerReplaceEntity,
  ) {
    const { privilege, ...rest } = data;
    const organizer = await this.organizerRepo.replaceOne(id, rest).exec();

    await this.auth.updateUserClaims(id, privilege);
    this.socket.emit("update:organizer", organizer, SocketRoom.ADMIN);

    return this.organizerService.injectUserRoles([organizer]).pipe(take(1));
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.EXEC)
  @ApiDoc({
    summary: "Delete an Organizer",
    params: [
      {
        name: "id",
        description: "ID must be set to an organizer's ID",
      },
    ],
    response: {
      noContent: true,
    },
    auth: Role.EXEC,
  })
  async deleteOne(@Param("id") id: string) {
    const organizer = await this.organizerRepo.deleteOne(id).exec();

    await this.auth.updateUserClaims(id, Role.NONE);
    this.socket.emit("delete:organizer", organizer, SocketRoom.ADMIN);

    return organizer;
  }

  @Get(":id/scans")
  @Roles(Role.EXEC)
  @RestrictedRoles({
    roles: [Role.TEAM],
    predicate: (req) => req.user && req.user.sub === req.params.id,
  })
  async getAllOrganizerScans(@Param("id") id: string) {
    return this.organizerRepo.findOne(id).raw().withGraphFetched("scans");
  }

  @Get(":id/judging/projects")
  @Roles(Role.EXEC)
  @RestrictedRoles({
    roles: [Role.TEAM],
    predicate: (req) => req.user && req.user.sub === req.params.id,
  })
  @ApiDoc({
    summary: "Get all assigned judging projects for an Organizer",
    auth: Role.TEAM,
    restricted: true,
    params: [
      {
        name: "id",
        description: "ID must be a valid organizer ID",
      },
    ],
    response: {
      ok: { type: [ProjectScoreEntity] },
    },
  })
  async getAllJudgingProjects(@Param("id") id: string) {
    const assignedProjects = await this.organizerRepo
      .findOne(id)
      .raw()
      .withGraphJoined("projects.scores(filterOrganizerScores)")
      .modifiers({
        filterOrganizerScores: (query) => query.modify("scoresByOrganizer", id),
      });

    return assignedProjects.projects.map(({ scores, ...p }) => ({
      ...p,
      score: scores[0],
    }));
  }

  @Patch(":id/judging/projects/:projectId")
  @Roles(Role.EXEC)
  @RestrictedRoles({
    roles: [Role.TEAM],
    predicate: (req) => req.user && req.user.sub === req.params.id,
  })
  @ApiDoc({
    summary: "Patch Judging Scores for Assigned Project",
    auth: Role.TEAM,
    restricted: true,
    params: [
      {
        name: "id",
        description: "ID must be set to a valid organizer's ID",
      },
      {
        name: "projectId",
        description: "ID must be set to a valid project's ID",
      },
    ],
    request: {
      body: { type: OrganizerUpdateScoreEntity },
    },
    response: {
      ok: { type: ScoreEntity },
    },
  })
  async patchAssignedProjectScore(
    @Param("id") id: string,
    @Param("projectId", ParseIntPipe) projectId: number,
    @Body(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        whitelist: true,
        transform: true,
      }),
    )
    data: OrganizerUpdateScoreEntity,
  ) {
    return this.scoreRepo.patchOne([id, projectId], data).exec();
  }
}
