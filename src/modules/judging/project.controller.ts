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
  UseInterceptors,
  ValidationPipe,
} from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { Project, ProjectEntity } from "entities/project.entity";
import { ApiTags, OmitType, PartialType } from "@nestjs/swagger";
import { Role, Roles } from "common/gcp";
import { ApiDoc } from "common/docs";
import { DBExceptionFilter } from "common/filters";
import { UploadProjectCsv } from "./upload-project-csv.decorator";
import { FileInterceptor } from "@nestjs/platform-express";
import { parse } from "csv-parse/sync";
import { Hackathon } from "entities/hackathon.entity";

class ProjectCreateEntity extends OmitType(ProjectEntity, ["id"] as const) {}

class ProjectPatchEntity extends PartialType(ProjectCreateEntity) {}

@ApiTags("Judging")
@Controller("judging/projects")
@UseFilters(DBExceptionFilter)
export class ProjectController {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(Hackathon)
    private readonly hackathonRepo: Repository<Hackathon>,
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

  @Post("/csv")
  @UseInterceptors(FileInterceptor("csv"))
  @ApiDoc({
    summary: "Create Projects from CSV",
    request: {
      body: { type: "file" },
      validate: true,
    },
    response: {
      created: { type: [ProjectEntity] },
    },
    auth: Role.TECH,
  })
  async createManyFromCsv(@UploadProjectCsv() csvFile: Express.Multer.File) {
    if (!csvFile) {
      throw new HttpException("CSV file is required", HttpStatus.BAD_REQUEST);
    }
    const activeHackathon = await Hackathon.query()
      .findOne({ active: true })
      .withGraphFetched("[events.location, sponsors]");
    const projects = this.parseCsv(
      csvFile.buffer.toString(),
      activeHackathon.id,
    );
    for (const project of projects) {
      try {
        await this.projectRepo.createOne(project).byHackathon();
      } catch (error) {
        console.log(error);
        throw new HttpException(
          "Failed to create project",
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }

    return projects;
  }

  private parseCsv(csv: string, hackathonId: string): ProjectCreateEntity[] {
    const results: ProjectCreateEntity[] = [];
    const requiredFields = [
      "Project Title",
      "Submission Url",
      "Project Status",
      "Judging Status",
      "Highest Step Completed",
      "Project Created At",
      "About The Project",
      '"Try it out" Links',
      "Video Demo Link",
      "Opt-In Prizes",
      "Built With",
      "Notes",
      "Team Colleges/Universities",
      "Additional Team Member Count",
    ];

    try {
      const records = parse(csv, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      for (const record of records) {
        if (this.isValidCsvFormat(record, requiredFields)) {
          if (record["Highest Step Completed"] === "Submit") {
            results.push(
              this.mapDataToProjectCreateEntity(record, hackathonId),
            );
          }
        } else {
          throw new HttpException(
            `CSV is missing required fields: ${requiredFields.join(", ")}`,
            HttpStatus.BAD_REQUEST,
          );
        }
      }
    } catch (error) {
      throw new HttpException("Failed to parse CSV", HttpStatus.BAD_REQUEST);
    }

    return results;
  }

  private isValidCsvFormat(data: any, requiredFields: string[]): boolean {
    return requiredFields.every((field) => field in data);
  }

  private mapDataToProjectCreateEntity(
    data: any,
    hackathonId: string,
  ): ProjectCreateEntity {
    return {
      name: data["Project Title"],
      hackathonId: hackathonId,
      categories: data["Opt-In Prizes"],
    };
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
