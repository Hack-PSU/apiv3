import { Controller, Get, Query } from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { Registration, RegistrationEntity } from "entities/registration.entity";
import { ApiTags } from "@nestjs/swagger";
import { Role, Roles } from "common/gcp";
import { ApiDoc } from "common/docs";

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
        name: "hackathonId",
        required: false,
        description:
          "ID can be set to a hackathon's ID. Defaults to current hackathon.",
      },
    ],
    response: {
      ok: { type: [RegistrationEntity] },
    },
  })
  async getAll(@Query("hackathonId") hackathonId?: string) {
    if (hackathonId) {
      return this.registrationRepo.findAll().byHackathon(hackathonId);
    } else {
      return this.registrationRepo.findAll().exec();
    }
  }
}
