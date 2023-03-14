import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
import { Project, ProjectEntity } from "entities/project.entity";
import { ApiTags, OmitType, PartialType } from "@nestjs/swagger";
import { Role, Roles } from "common/gcp";
import { ApiDoc } from "common/docs";
import { DBExceptionFilter } from "common/filters";

class ProjectCreateEntity extends OmitType(ProjectEntity, ["id"] as const) {}

class ProjectPatchEntity extends PartialType(ProjectCreateEntity) {}

@ApiTags("Judging")
@Controller("judging/projects")
@UseFilters(DBExceptionFilter)
export class ProjectController {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  @Get("/")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Get All Projects",
    response: {
      ok: { type: [ProjectEntity] },
    },
    auth: Role.TEAM,
  })
  async getAll() {
    return this.projectRepo.findAll().byHackathon();
  }

  @Post("/")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Create a Project",
    request: {
      body: { type: ProjectCreateEntity },
      validate: true,
    },
    response: {
      created: { type: ProjectEntity },
    },
    auth: Role.TEAM,
  })
  async createOne(
    @Body(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        whitelist: true,
        transform: true,
      }),
    )
    data: ProjectCreateEntity,
  ) {
    return this.projectRepo.createOne(data).byHackathon();
  }

  @Get(":id")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Get a Project",
    params: [
      {
        name: "id",
        description: "ID must be set to a project's ID",
      },
    ],
    response: {
      ok: { type: ProjectEntity },
    },
    auth: Role.TEAM,
  })
  async getOne(@Param("id", ParseIntPipe) id: number) {
    return this.projectRepo.findOne(id).exec();
  }

  @Patch(":id")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Patch a Project",
    params: [
      {
        name: "id",
        description: "ID must be set to a project's ID",
      },
    ],
    request: {
      body: { type: ProjectPatchEntity },
      validate: true,
    },
    response: {
      ok: { type: ProjectEntity },
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
    data: ProjectPatchEntity,
  ) {
    return this.projectRepo.patchOne(id, data).exec();
  }

  @Put(":id")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Replace a Project",
    params: [
      {
        name: "id",
        description: "ID must be set to a project's ID",
      },
    ],
    request: {
      body: { type: ProjectCreateEntity },
      validate: true,
    },
    response: {
      ok: { type: ProjectEntity },
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
    data: ProjectCreateEntity,
  ) {
    return this.projectRepo.replaceOne(id, data).exec();
  }

  @Delete(":id")
  @Roles(Role.EXEC)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDoc({
    summary: "Delete a Project",
    params: [
      {
        name: "id",
        description: "ID must be set to a project's ID",
      },
    ],
    response: {
      noContent: true,
    },
    auth: Role.EXEC,
  })
  async deleteOne(@Param("id", ParseIntPipe) id: number) {
    return this.projectRepo.deleteOne(id).exec();
  }
}
