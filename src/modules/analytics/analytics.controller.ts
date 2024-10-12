import { Controller, Get } from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { Hackathon } from "entities/hackathon.entity";
import { User } from "entities/user.entity";
import { Registration } from "entities/registration.entity";
import {
  ApiExtraModels,
  ApiProperty,
  ApiTags,
  PickType,
} from "@nestjs/swagger";
import { ApiDoc } from "common/docs";
import { Role, Roles } from "common/gcp";
import { Organizer, OrganizerEntity } from "entities/organizer.entity";
import { Event, EventEntity } from "entities/event.entity";

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

class AnalyticsScansResponse extends PickType(OrganizerEntity, [
  "id",
  "firstName",
  "lastName",
] as const) {
  @ApiProperty()
  count: number;
}

class AnalyticsEventsResponse extends PickType(EventEntity, [
  "type",
  "id",
  "name",
] as const) {
  @ApiProperty()
  count: number;
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
    @InjectRepository(Organizer)
    private readonly organizerRepo: Repository<Organizer>,
    @InjectRepository(Registration)
    private readonly registrationRepo: Repository<Registration>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
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

  @Get("/events")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Get Check-In count for each event",
    auth: Role.TEAM,
    response: {
      ok: { type: AnalyticsEventsResponse },
    },
  })
  async getEventsAnalytics() {
    return this.eventRepo
      .findAll()
      .byHackathon()
      .joinRelated("scans")
      .count("scans.userId", { as: "count" })
      .groupBy("scans.event_id")
      .having("count", ">", 0)
      .select("events.id", "events.name", "events.type");
  }

  @Get("/scans")
  async getOrganizerScans() {
    return this.organizerRepo
      .findAll()
      .raw()
      .joinRelated("scans")
      .count("scans.organizerId", { as: "count" })
      .groupBy("organizers.id")
      .orderBy("count", "DESC")
      .select("organizers.id", "organizers.firstName", "organizers.lastName")
      .where(
        "scans.hackathonId",
        "=",
        this.hackathonRepo.findAll().raw().where("active", true).select("id"),
      );
  }
}
