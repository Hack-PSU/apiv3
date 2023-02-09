import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
} from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { Project, ProjectEntity } from "entities/project.entity";
import {
  ApiBody,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  OmitType,
  PartialType,
} from "@nestjs/swagger";
import { ApiAuth } from "common/docs/api-auth";
import { Role } from "common/gcp";

class ProjectCreateEntity extends OmitType(ProjectEntity, ["id"] as const) {}

class ProjectPatchEntity extends PartialType(ProjectCreateEntity) {}

@ApiTags("Judging")
@Controller("judging/projects")
export class ProjectController {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  @Get("/")
  @ApiOperation({ summary: "Get All Projects" })
  @ApiOkResponse({ type: [ProjectEntity] })
  @ApiAuth(Role.TEAM)
  async getAll() {
    return this.projectRepo.findAll().byHackathon();
  }

  @Post("/")
  @ApiOperation({ summary: "Create a Project" })
  @ApiBody({ type: ProjectCreateEntity })
  @ApiOkResponse({ type: ProjectEntity })
  @ApiAuth(Role.TEAM)
  async createOne(@Body() data: ProjectCreateEntity) {
    return this.projectRepo.createOne(data).byHackathon();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a Project" })
  @ApiParam({ name: "id", description: "ID must be set to a project's ID" })
  @ApiOkResponse({ type: ProjectEntity })
  @ApiAuth(Role.TEAM)
  async getOne(@Param("id") id: number) {
    return this.projectRepo.findOne(id).exec();
  }

  @Patch(":id")
  @ApiOperation({ summary: "Patch a Project" })
  @ApiParam({ name: "id", description: "ID must be set to a project's ID" })
  @ApiBody({ type: ProjectPatchEntity })
  @ApiOkResponse({ type: ProjectEntity })
  @ApiAuth(Role.TEAM)
  async patchOne(@Param("id") id: number, @Body() data: ProjectPatchEntity) {
    return this.projectRepo.patchOne(id, data).exec();
  }

  @Put(":id")
  @ApiOperation({ summary: "Replace a Project" })
  @ApiParam({ name: "id", description: "ID must be set to a project's ID" })
  @ApiBody({ type: ProjectCreateEntity })
  @ApiOkResponse({ type: ProjectEntity })
  @ApiAuth(Role.TEAM)
  async replaceOne(@Param("id") id: number, @Body() data: ProjectCreateEntity) {
    return this.projectRepo.replaceOne(id, data).exec();
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a Project" })
  @ApiParam({ name: "id", description: "ID must be set to a project's ID" })
  @ApiNoContentResponse()
  @ApiAuth(Role.EXEC)
  async deleteOne(@Param("id") id: number) {
    return this.projectRepo.deleteOne(id).exec();
  }
}
