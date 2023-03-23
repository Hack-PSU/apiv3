import { Controller, Get } from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { Hackathon } from "entities/hackathon.entity";
import { User } from "entities/user.entity";
import { Registration } from "entities/registration.entity";
import { ApiExtraModels, ApiProperty, ApiTags } from "@nestjs/swagger";
import { ApiDoc } from "common/docs";
import { Role, Roles } from "common/gcp";

class CountsResponse {
  @ApiProperty()
  count: number;
}

class RegistrationCounts extends CountsResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}

class GenderCounts extends CountsResponse {
  @ApiProperty()
  gender: string;
}

class RaceCounts extends CountsResponse {
  @ApiProperty()
  race: string;
}

class AcademicYearCounts extends CountsResponse {
  @ApiProperty()
  academicYear: string;
}

class CodingExpCounts extends CountsResponse {
  @ApiProperty()
  codingExperience: string;
}

class AnalyticsSummaryResponse {
  @ApiProperty({ type: [RegistrationCounts] })
  registrations: RegistrationCounts[];

  @ApiProperty({ type: [GenderCounts] })
  gender: GenderCounts[];

  @ApiProperty({ type: [RaceCounts] })
  race: RaceCounts[];

  @ApiProperty({ type: [AcademicYearCounts] })
  academicYear: AcademicYearCounts[];

  @ApiProperty({ type: [CodingExpCounts] })
  codingExp: CodingExpCounts[];
}

@ApiTags("Analytics")
@Controller("analytics")
@ApiExtraModels(AnalyticsSummaryResponse)
export class AnalyticsController {
  constructor(
    @InjectRepository(Hackathon)
    private readonly hackathonRepo: Repository<Hackathon>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Registration)
    private readonly registrationRepo: Repository<Registration>,
  ) {}

  @Get("/summary")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Get analytics summary for current hackathon",
    auth: Role.TEAM,
    response: {
      ok: { type: AnalyticsSummaryResponse },
    },
  })
  async getSummary() {
    // get all registration counts by hackathon
    const registrationCountsByHackathon = await Hackathon.query()
      .joinRelated("registrations")
      .count("registrations.hackathonId", { as: "count" })
      .groupBy("hackathons.id")
      .orderBy("hackathons.startTime")
      .select("hackathons.id", "hackathons.name");

    // get all gender counts for active hackathon
    const activeGenderCounts = await this.userRepo
      .findAll()
      .byHackathon()
      .count("gender", { as: "count" })
      .groupBy("gender")
      .select("gender");

    // get all race counts for active hackathon
    const activeRaceEthnicityCounts = await this.userRepo
      .findAll()
      .byHackathon()
      .count("race", { as: "count" })
      .groupBy("race")
      .select("race");

    // get all academic year counts for active hackathon
    const activeAcademicYearCounts = await this.registrationRepo
      .findAll()
      .byHackathon()
      .count("academicYear", { as: "count" })
      .groupBy("academicYear")
      .select("academicYear");

    // get all coding experience counts for active hackathon
    const activeCodingExpCounts = await this.registrationRepo
      .findAll()
      .byHackathon()
      .count("codingExperience", { as: "count" })
      .groupBy("codingExperience")
      .select("codingExperience");

    return {
      registrations: registrationCountsByHackathon,
      gender: activeGenderCounts,
      race: activeRaceEthnicityCounts,
      academicYear: activeAcademicYearCounts,
      codingExp: activeCodingExpCounts,
    };
  }
}
