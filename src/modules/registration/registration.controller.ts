import { Controller, Get, Patch, Query, Param, Body, ValidationPipe, NotFoundException } from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { Registration, RegistrationEntity, ApplicationStatus } from "entities/registration.entity";
import { Hackathon } from "entities/hackathon.entity";
import { ApiProperty, ApiTags } from "@nestjs/swagger";
import { Role, Roles } from "common/gcp";
import { ApiDoc } from "common/docs";
import { IsBoolean, IsEnum, IsOptional } from "class-validator";
import { Transform } from "class-transformer";

import { User } from "entities/user.entity";
import {
  DefaultFromEmail,
  DefaultTemplate,
  SendGridService,
} from "common/sendgrid";

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
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly sendGridService: SendGridService, 
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
      application_status: body.status,
    };

    if (body.status === ApplicationStatus.ACCEPTED) {
      const now = new Date();
      const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      updateData.accepted_at = now;
      updateData.rsvp_deadline = oneWeekFromNow;

      const activeHackathonName = await Hackathon.query().findOne({ active: true }).select("name").first();
      const user = await this.userRepo.findOne(userId).exec();
      if (
        user &&
        process.env.RUNTIME_INSTANCE &&
        process.env.RUNTIME_INSTANCE === "production"
      ) {
        const message = await this.sendGridService.populateTemplate(
          DefaultTemplate.participantAccepted,
          {
            previewText: `You've been accepted to HackPSU ${activeHackathonName.name}!`,
            date: "March 28-29, 2026",
            address: "ECore Building, University Park PA",
            firstName: user.firstName,
            hackathon: activeHackathonName.name,
          },
        );

        await this.sendGridService.send({
          from: DefaultFromEmail,
          to: user.email,
          subject: `ACTION REQUIRED: RSVP for HackPSU ${activeHackathonName.name}!`,
          message,
        });
      }
    }

    await registration.$query().patch(updateData);

    return registration.$query();
  }

}
