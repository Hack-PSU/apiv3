import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseInterceptors,
  ValidationPipe,
} from "@nestjs/common";
import { ApiProperty, ApiTags, OmitType } from "@nestjs/swagger";
import { InjectRepository, Repository } from "common/objection";
import {
  OrganizerApplication,
  OrganizerApplicationEntity,
  OrganizerTeam,
} from "entities/organizer-application.entity";
import { Role, Roles } from "common/gcp";
import { ApiDoc } from "common/docs";
import { FileInterceptor } from "@nestjs/platform-express";
import { UploadedResume } from "./uploaded-resume.decorator";
import { OrganizerApplicationService } from "./organizer-application.service";
import { IsEmail, IsEnum, IsString } from "class-validator";

class OrganizerApplicationCreateEntity extends OmitType(
  OrganizerApplicationEntity,
  [
    "id",
    "resumeUrl",
    "firstChoiceStatus",
    "secondChoiceStatus",
    "assignedTeam",
    "createdAt",
    "updatedAt",
  ] as const,
) {}

class ApplicationActionDto {
  @ApiProperty({ enum: OrganizerTeam })
  @IsEnum(OrganizerTeam)
  team: OrganizerTeam;
}

@ApiTags("Organizer Applications")
@Controller("organizer-applications")
export class OrganizerApplicationController {
  constructor(
    @InjectRepository(OrganizerApplication)
    private readonly applicationRepo: Repository<OrganizerApplication>,
    private readonly applicationService: OrganizerApplicationService,
  ) {}

  @Post("/")
  @UseInterceptors(FileInterceptor("resume"))
  @ApiDoc({
    summary: "Submit an organizer application",
    request: {
      mimeTypes: ["multipart/form-data"],
    },
    response: {
      created: { type: OrganizerApplicationEntity },
    },
    auth: Role.NONE,
  })
  async create(
    @Body(new ValidationPipe({ transform: true }))
    applicationData: OrganizerApplicationCreateEntity,
    @UploadedResume() resume: Express.Multer.File,
  ): Promise<OrganizerApplication> {
    // First create the application without resume URL to get the ID
    const application = await this.applicationRepo
      .createOne({
        ...applicationData,
        resumeUrl: "pending", // Temporary value
      })
      .exec();

    // Upload the resume with the application ID
    const resumeUrl = await this.applicationService.uploadResume(
      application.id,
      applicationData.email,
      resume,
    );

    // Update the application with the actual resume URL
    return this.applicationRepo.patchOne(application.id, { resumeUrl }).exec();
  }

  @Get("/")
  @Roles(Role.EXEC)
  @ApiDoc({
    summary: "Get all organizer applications",
    response: {
      ok: { type: [OrganizerApplicationEntity] },
    },
    auth: Role.EXEC,
  })
  async getAll(): Promise<OrganizerApplication[]> {
    return this.applicationRepo.findAll().exec();
  }

  @Get("/by-team/:team")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Get applications for a specific team",
    response: {
      ok: {
        schema: {
          type: "object",
          properties: {
            firstChoiceApplications: {
              type: "array",
              items: {
                $ref: "#/components/schemas/OrganizerApplicationEntity",
              },
            },
            secondChoiceApplications: {
              type: "array",
              items: {
                $ref: "#/components/schemas/OrganizerApplicationEntity",
              },
            },
          },
        },
      },
    },
    auth: Role.TEAM,
  })
  async getByTeam(@Param("team") team: OrganizerTeam): Promise<{
    firstChoiceApplications: OrganizerApplication[];
    secondChoiceApplications: OrganizerApplication[];
  }> {
    return this.applicationService.getApplicationsForTeam(team);
  }

  @Get("/:id")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Get a specific application by ID",
    response: {
      ok: { type: OrganizerApplicationEntity },
    },
    auth: Role.TEAM,
  })
  async getOne(
    @Param("id", ParseIntPipe) id: number,
  ): Promise<OrganizerApplication> {
    return this.applicationRepo.findOne(id).exec();
  }

  @Patch("/:id/accept")
  @Roles(Role.EXEC)
  @ApiDoc({
    summary: "Accept an application for a specific team",
    response: {
      ok: { type: OrganizerApplicationEntity },
    },
    auth: Role.EXEC,
  })
  async accept(
    @Param("id", ParseIntPipe) id: number,
    @Body(new ValidationPipe({ transform: true })) action: ApplicationActionDto,
  ): Promise<OrganizerApplication> {
    return this.applicationService.acceptApplication(id, action.team);
  }

  @Patch("/:id/reject")
  @Roles(Role.EXEC)
  @ApiDoc({
    summary: "Reject an application from a specific team",
    response: {
      ok: { type: OrganizerApplicationEntity },
    },
    auth: Role.EXEC,
  })
  async reject(
    @Param("id", ParseIntPipe) id: number,
    @Body(new ValidationPipe({ transform: true })) action: ApplicationActionDto,
  ): Promise<OrganizerApplication> {
    return this.applicationService.rejectApplication(id, action.team);
  }
}
