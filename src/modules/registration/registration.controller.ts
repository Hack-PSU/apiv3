import { Controller, Get, Patch, Query, Param, Body, ValidationPipe, NotFoundException } from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { Registration, RegistrationEntity, ApplicationStatus } from "entities/registration.entity";
import { ApiProperty, ApiTags } from "@nestjs/swagger";
import { Role, Roles } from "common/gcp";
import { ApiDoc } from "common/docs";
import { IsBoolean, IsEnum, IsOptional } from "class-validator";
import { Transform } from "class-transformer";


class UpdateStatusDto {
  @ApiProperty({ enum: ApplicationStatus })
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;
}


class ActiveRegistrationParams {
  @ApiProperty()
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    switch (value) {
      case "true":
        return true;
      case "false":
        return false;
      default:
        return undefined;
    }
  })
  all?: boolean;
}

@ApiTags("Registrations")
@Controller("registrations")
export class RegistrationController {
  constructor(
    @InjectRepository(Registration)
    private readonly registrationRepo: Repository<Registration>,
  ) {}

  @Get("/")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Get All Registrations",
    auth: Role.TEAM,
    query: [
      {
        name: "all",
        type: "boolean",
        required: false,
        description: "Set all to true to return all registrations.",
      },
    ],
    response: {
      ok: { type: [RegistrationEntity] },
    },
  })
  async getAll(
    @Query(new ValidationPipe({ transform: true }))
    { all }: ActiveRegistrationParams,
  ) {
    if (all) {
      return this.registrationRepo.findAll().exec();
    } else {
      return this.registrationRepo.findAll().byHackathon();
    }
  }

  @Patch("/:userId/application-status")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Update Application Status",
    auth: Role.TEAM,
    params: [
      {
        name: "userId",
        type: "string",
        description: "The ID of the user to update",
      },
    ],
    response: {
      ok: { type: RegistrationEntity },
    },
  })
  async updateApplicationStatus(
    @Param("userId") userId: string,
    @Body(new ValidationPipe()) body: UpdateStatusDto,
  ) {
    const registration = await this.registrationRepo
      .findAll()
      .byHackathon()
      .where("userId", userId)
      .first();

    if (!registration) {
      throw new NotFoundException(`Registration for user ${userId} not found`);
    }

    const updateData: Partial<Registration> = {
      applicationStatus: body.status,
    };

    if (body.status === ApplicationStatus.ACCEPTED) {
      const now = new Date();
      const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      updateData.acceptedAt = now;
      updateData.rsvpDeadline = oneWeekFromNow;
    }

    await registration.$query().patch(updateData);

    return registration.$query();
  }

}
