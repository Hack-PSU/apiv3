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
import { Scan } from "entities/scan.entity";

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

class AnalyticsApplicationsResponse {
  @ApiProperty()
  attendanceRate: number;

  @ApiProperty()
  confirmRate: number;

  @ApiProperty()
  averageConfirmTime: number;

  @ApiProperty()
  acceptanceTotal: number;

  @ApiProperty()
  acceptanceRate: number;
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
    @InjectRepository(Scan)
    private readonly scanRepo: Repository<Scan>,
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

  @Get("/applications")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Get application metrics for each event",
    auth: Role.TEAM,
    response: {
      ok: { type: AnalyticsApplicationsResponse },
    },
  })
  async getApplicationAnalytics() {
    // Get the total count of applicants for the active hackathon
    const totalApplicants = await this.registrationRepo
      .findAll()
      .byHackathon()
      .count("id", { as: "count" })
      .first();

    // Get application statuses and rsvp for the current hackathon
    const applications = await this.registrationRepo
      .findAll()
      .byHackathon()
      .select(
        "user_id",
        "application_status",
        "accepted_at",
        "rsvp_at",
        "rsvp_deadline"
      );

    // Get all the confirmed, declined, accpted applicants
    const confirmedApplicants = applications.filter(app => app.applicationStatus === "confirmed");
    const declinedApplicants = applications.filter(app => app.applicationStatus === "declined");
    const acceptedApplicants = applications.filter(app => app.applicationStatus === "accepted");
    
    // Total is all 3 added together
    const totalAccepted = confirmedApplicants.length + declinedApplicants.length + acceptedApplicants.length;

    // Filter all users that have confirmed and scanned in with checkIn
    const confirmedAndScannedApplicants = await this.scanRepo
      .findAll()
      .byHackathon()
      .joinRelated("event")
      .whereIn("user_id", confirmedApplicants.map(app => app.userId))
      .where("event.type", "checkIn")
      .groupBy("user_id")
      .select("user_id");

    // Calculate metrics; (average confirm time in nanoseconds)
    return {
      attendanceRate: confirmedAndScannedApplicants.length / confirmedApplicants.length,
      confirmRate: confirmedApplicants.length / totalAccepted,
      averageConfirmTime: confirmedApplicants.reduce((acc, app) => acc + (app.rsvpAt - app.acceptedAt), 0) / confirmedApplicants.length,
      acceptanceTotal: totalAccepted,
      acceptanceRate: totalAccepted / totalApplicants.count,
    };
  }
}
