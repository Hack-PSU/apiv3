import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseFilters,
  ValidationPipe,
} from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { ApiTags, PartialType, PickType } from "@nestjs/swagger";
import { Role, Roles } from "common/gcp";
import { ApiDoc } from "common/docs";
import { DBExceptionFilter } from "common/filters";
import { randomUUID } from "crypto";
import { BugReport, BugReportEntity, BugStatus } from "entities/bug-report.entity";

class BugReportCreateEntity extends PickType(BugReportEntity, [
  "title",
  "description",
  "severity",
  "status",
] as const) {}

class BugReportUpdateEntity extends PartialType(BugReportCreateEntity) {}

@ApiTags("Bug Reports")
@Controller("bug-reports")
@UseFilters(DBExceptionFilter)
export class BugReportController {
  constructor(
    @InjectRepository(BugReport)
    private readonly bugReportRepo: Repository<BugReport>,
  ) {}

  @Get("/")
  @Roles(Role.TECH)
  @ApiDoc({
    summary: "Get All Bug Reports",
    response: {
      ok: { type: [BugReportEntity] },
    },
    auth: Role.TEAM,
  })
  async getAll() {
    return this.bugReportRepo.findAll().exec();
  }

  @Get(":id")
  @Roles(Role.TECH)
  @ApiDoc({
    summary: "Get a Bug Report",
    params: [{ name: "id", description: "ID must be set to a bug report's ID" }],
    response: {
      ok: { type: BugReportEntity },
    },
    auth: Role.TEAM,
  })
  async getOne(@Param("id") id: string) {
    const bug = await this.bugReportRepo.findOne(id).exec();
    if (!bug) {
      throw new NotFoundException("Bug report not found");
    }
    return bug;
  }

  @Post("/")
  @Roles(Role.NONE)
  @ApiDoc({
    summary: "Create a Bug Report",
    request: {
      body: { type: BugReportCreateEntity },
      validate: true,
    },
    response: {
      created: { type: BugReportEntity },
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
    data: BugReportCreateEntity,
  ) {
    const now = Date.now();

    const bug: Partial<BugReport> = {
      ...data,
      id: randomUUID(),
      status: data.status ?? BugStatus.UNSEEN,
      dateReported: now,
      dateUpdated: now,
    };

    return this.bugReportRepo.createOne(bug).exec();
  }

  @Patch(":id")
  @Roles(Role.TECH)
  @ApiDoc({
    summary: "Update a Bug Report",
    params: [{ name: "id", description: "ID must be set to a bug report's ID" }],
    request: {
      body: { type: BugReportUpdateEntity },
      validate: true,
    },
    response: {
      ok: { type: BugReportEntity },
    },
    auth: Role.TEAM,
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
    data: BugReportUpdateEntity,
  ) {
    const existing = await this.bugReportRepo.findOne(id).exec();
    if (!existing) {
      throw new NotFoundException("Bug report not found");
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException("No fields provided to update");
    }

    return this.bugReportRepo
      .patchOne(id, { ...data, dateUpdated: Date.now() } as Partial<BugReport>)
      .exec();
  }
}