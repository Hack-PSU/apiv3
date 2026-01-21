import { Controller, Get, Query, ValidationPipe } from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { Registration, RegistrationEntity } from "entities/registration.entity";
import { ApiProperty, ApiTags } from "@nestjs/swagger";
import { Role, Roles } from "common/gcp";
import { ApiDoc } from "common/docs";
import { IsBoolean, IsOptional } from "class-validator";
import { Transform } from "class-transformer";
import { User } from "entities/user.entity";

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

  @Get("/random")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Get next random pending registration to review",
    response: {
      ok: { type: RegistrationEntity }
    },
    auth: Role.TEAM
  })
  async getRandom(
    @Query(new ValidationPipe({ transform: true }))
    { all }: ActiveRegistrationParams,
  ) {
    // Build the query builder
    const staged = this.registrationRepo.findAll();
    const query = all ? staged.raw() : staged.byHackathon();

    // Get a random registration that is pending review
    const result = await query.where("review_status", "pending_review").orderByRaw("RANDOM()").limit(1).first();

    // Send a patch to update the review status to "in_review"
    await this.registrationRepo.patchOne(result.id, { review_status: "in_review" });

    // Return registration along with user details
    return {
      registration: result,
      user: await this.userRepo.findOne(result.userId).exec(),
    };
  }
}
