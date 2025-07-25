import {
  BadRequestException,
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
import { ApiDoc, BadRequestExceptionResponse } from "common/docs";
import { DBExceptionFilter } from "common/filters";
import { Project, ProjectEntity } from "entities/project.entity";
import { Score, ScoreEntity } from "entities/score.entity";
import { JudgingService } from "modules/judging/judging.service";
import { IsNumber, IsOptional } from "class-validator";
import { Hackathon } from "entities/hackathon.entity";
import {
  DefaultFromEmail,
  DefaultTemplate,
  SendGridService,
} from "common/sendgrid";
import { nanoid } from "nanoid";

class OrganizerCreateEntity extends OmitType(OrganizerEntity, [
  "id",
  "award",
  "judgingLocation",
  "isActive",
] as const) {}

class OrganizerReplaceEntity extends OrganizerCreateEntity {}

class OrganizerUpdateEntity extends PartialType(OrganizerReplaceEntity) {}

class ScoreDataEntity extends OmitType(ScoreEntity, [
  "hackathonId",
  "judgeId",
  "projectId",
] as const) {}

class OrganizerUpdateScoreEntity extends PartialType(ScoreDataEntity) {}

class ProjectScoreEntity extends OmitType(ProjectEntity, ["hackathonId"]) {
  @ApiProperty({ type: ScoreDataEntity })
  score: ScoreDataEntity;
}

class ProjectReassignEntity {
  @ApiProperty()
  @IsOptional()
  @IsNumber({}, { each: true })
  excludeProjects: number[] = [];
}

@ApiTags("Organizers")
@Controller("organizers")
@UseFilters(DBExceptionFilter)
export class OrganizerController {
  constructor(
    @InjectRepository(Organizer)
    private readonly organizerRepo: Repository<Organizer>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(Score)
    private readonly scoreRepo: Repository<Score>,
    private readonly socket: SocketGateway,
    private readonly auth: FirebaseAuthService,
    private readonly sendGridService: SendGridService,
    private readonly organizerService: OrganizerService,
    private readonly judgingService: JudgingService,
  ) {}

  @Get("/")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Get All Organizers",
    response: {
      ok: { type: [OrganizerEntity] },
    },
    auth: Role.EXEC,
  })
  async getAll() {
    const organizers = await this.organizerRepo.findAll().exec();

    return this.organizerService.injectUserRoles(organizers).pipe(toArray());
  }

  @Post("/")
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
        enableDebugMessages: true,
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
    const { privilege, email, ...user } = data;

    let UID = await this.auth
      .getUserByEmail(email)
      .then((u) => u?.uid)
      .catch(() => null);

    if (UID) {
      await this.auth.updateUserPrivilege(UID, privilege);
    } else {
      UID = await this.auth.createUserWithPrivilege(email, nanoid(), privilege);

      if (!UID) {
        throw new HttpException(
          "Failed to create user",
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }

    const organizer = await this.organizerRepo
      .createOne({
        id: UID,
        email: email,
        isActive: true,
        ...user,
      })
      .exec();

    this.socket.emit("create:organizer", organizer, SocketRoom.ADMIN);

    const passwordResetLink = await this.auth.generatePasswordResetLink(email);

    const message = await this.sendGridService.populateTemplate(
      DefaultTemplate.organizerFirstLogin,
      {
        previewText: "HackPSU Fall 2024 Organizer Account",
        passwordResetLink: passwordResetLink,
        firstName: organizer.firstName,
      },
    );

    this.sendGridService.send({
      to: email,
      from: DefaultFromEmail,
      subject: "HackPSU Organizer Account",
      message,
    });

    return this.organizerService.injectUserRoles([organizer]).pipe(take(1));
  }

  @Post("/resend-verification")
  @ApiDoc({
    summary: "Resend Verification Email to all Organizers",
    auth: Role.EXEC,
    response: {
      noContent: true,
    },
  })
  @Roles(Role.TECH)
  async resendAllVerificationEmails() {
    const allOrganizers = await this.organizerRepo.findAll().exec();

    for (const organizer of allOrganizers) {
      if (!organizer.isActive) {
        continue;
      }
      try {
        const passwordResetLink = await this.auth.generatePasswordResetLink(
          organizer.email,
        );

        const message = await this.sendGridService.populateTemplate(
          DefaultTemplate.organizerFirstLogin,
          {
            previewText: "HackPSU Spring 2025 Organizer Account",
            passwordResetLink: passwordResetLink,
            firstName: organizer.firstName,
          },
        );

        await this.sendGridService.send({
          to: organizer.email,
          from: DefaultFromEmail,
          subject: "HackPSU Organizer Account Password Reset",
          message,
        });
      } catch (error) {
        console.error("Email could not be sent to ${organizer.email}", error);
      }
    }

    return { message: "All verification emails have been sent to organizers" };
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

    if (!organizer) {
      return;
    }

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
    let organizer = await this.organizerRepo.patchOne(id, rest).exec();

    if (privilege) {
      await this.auth.updateUserPrivilege(id, privilege);
    }

    this.socket.emit("update:organizer", organizer, SocketRoom.ADMIN);

    organizer = await this.organizerRepo.findOne(id).exec();

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

    await this.auth.updateUserPrivilege(id, privilege);
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
    const organizer = await this.organizerRepo
      .patchOne(id, { isActive: false })
      .exec();

    await this.auth.updateUserPrivilege(id, Role.NONE);
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
    const activeHackathon = await Hackathon.query()
      .where("active", true)
      .select("id")
      .first();

    const assignedProjects = await this.organizerRepo
      .findOne(id)
      .raw()
      .withGraphJoined(
        "projects(filterCurrentHackathon).scores(filterOrganizerScores)",
      )
      .modifiers({
        filterOrganizerScores: (query) => query.modify("scoresByOrganizer", id),
        filterCurrentHackathon: (query) =>
          query.modify("projectsByHackathon", activeHackathon.id),
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

  @Delete(":id/judging/projects/:projectId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.EXEC)
  @RestrictedRoles({
    roles: [Role.TEAM],
    predicate: (req) => req.user && req.user.sub === req.params.id,
  })
  @ApiDoc({
    summary: "Delete Judging Project and Reassign Organizer",
    auth: Role.TEAM,
    params: [
      {
        name: "id",
        description: "ID must be set to a valid organizer ID",
      },
      {
        name: "projectId",
        description: "ID must be set to a valid project ID",
      },
    ],
    request: {
      body: { type: ProjectReassignEntity },
    },
    response: {
      noContent: true,
      custom: [
        {
          status: HttpStatus.BAD_REQUEST,
          type: BadRequestExceptionResponse,
        },
      ],
    },
    restricted: true,
  })
  async deleteProjectAndReassign(
    @Param("id") id: string,
    @Param("projectId", ParseIntPipe) projectId: number,
    @Body(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        whitelist: true,
        transform: true,
      }),
    )
    data: ProjectReassignEntity,
  ) {
    const judge = await this.organizerRepo.findOne(id).exec();
    const project = await this.projectRepo.findOne(projectId).exec();

    if (!judge) {
      throw new BadRequestException("Invalid organizer");
    }

    if (!project) {
      throw new BadRequestException("Invalid projectId");
    }

    await this.scoreRepo.deleteOne([id, projectId]).exec();

    let excludeProjects;

    if (!data.excludeProjects.includes(projectId)) {
      excludeProjects = [...data.excludeProjects, projectId];
    } else {
      excludeProjects = data.excludeProjects;
    }

    const newAssignment = await this.judgingService.reassignJudge(
      id,
      excludeProjects,
    );

    if (newAssignment !== null) {
      await this.scoreRepo.createOne(newAssignment).byHackathon();
    }

    this.socket.emit(
      "update:judging:exclude",
      { excludeProjects, project: project.name },
      SocketRoom.ADMIN,
    );

    this.socket.emit(
      "update:judging:reassign",
      {
        judge: `${judge.firstName} ${judge.lastName}`,
        project: project.name,
      },
      SocketRoom.EXEC,
    );
  }
}
