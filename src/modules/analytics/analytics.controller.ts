import { Controller, Get, Query, Response } from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { Hackathon } from "entities/hackathon.entity";
import { User } from "entities/user.entity";
import { Scan, ScanEntity } from "entities/scan.entity";
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
import { ApiQuery } from "@nestjs/swagger";

const PDFDocument = require("pdfkit");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");

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

class CheckInsResponse {
  @ApiProperty({ type: [String] })
  timestamps: string[];
}

@ApiTags("Analytics")
@Controller("analytics")
@ApiExtraModels(AnalyticsSummaryResponse, ScanEntity)
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

  @Get("/check-ins")
  @Roles(Role.TEAM)
  @ApiQuery({
    name: "hackathonId",
    required: true,
    type: String,
    description: "The hackathon ID to fetch check-ins for",
  })
  @ApiDoc({
    summary: "All check‑in scan entries for a hackathon",
    auth: Role.TEAM,
    response: { ok: { type: CheckInsResponse } },
  })
  async getCheckIns(@Query("hackathonId") hackathonId: string) {
    const checkInId = await this.eventRepo
      .findAll()
      .raw()
      .where("hackathonId", hackathonId)
      .where("type", "checkIn")
      .select("id");

    const scans = await this.scanRepo
      .findAll()
      .raw()
      .where("hackathonId", "=", hackathonId)
      .where("eventId", "=", checkInId[0].id)
      .orderBy("timestamp")
      .select("timestamp");

    return {
      timestamps: scans.map((scan) => scan.timestamp),
    };
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

  @Get("/pdf")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Generate analytics PDF report",
    auth: Role.TEAM,
  })
  async getPdf(@Response() res: any) {
    try {
      // Fetch analytics data using same queries as summary endpoint
      const registrationCountsByHackathon = (await Hackathon.query()
        .joinRelated("registrations")
        .count("registrations.hackathonId", { as: "count" })
        .groupBy("hackathons.id")
        .orderBy("hackathons.startTime")
        .select("hackathons.id", "hackathons.name")) as any;

      const activeGenderCounts = await this.userRepo
        .findAll()
        .byHackathon()
        .count("gender", { as: "count" })
        .groupBy("gender")
        .select("gender");

      const activeRaceEthnicityCounts = await this.userRepo
        .findAll()
        .byHackathon()
        .count("race", { as: "count" })
        .groupBy("race")
        .select("race");

      const activeAcademicYearCounts = await this.registrationRepo
        .findAll()
        .byHackathon()
        .count("academicYear", { as: "count" })
        .groupBy("academicYear")
        .select("academicYear");

      const activeCodingExpCounts = await this.registrationRepo
        .findAll()
        .byHackathon()
        .count("codingExperience", { as: "count" })
        .groupBy("codingExperience")
        .select("codingExperience");

      // Create PDF document
      const doc = new PDFDocument({
        size: "A4",
        margin: 40,
      });

      // Set response headers
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="analytics-report.pdf"'
      );

      // Pipe document to response
      doc.pipe(res);

      // Add title
      doc
        .fontSize(24)
        .font("Helvetica-Bold")
        .text("Analytics Report", { align: "center" });

      doc.moveDown(0.5);
      doc
        .fontSize(12)
        .font("Helvetica")
        .text(`Generated on ${new Date().toLocaleString()}`, { align: "center" });

      doc.moveDown(1.5);

      // Add summary metrics
      doc.fontSize(16).font("Helvetica-Bold").text("Summary Metrics");
      doc.moveDown(0.5);

      const totalRegistrations = registrationCountsByHackathon.reduce(
        (sum, r) => sum + r.count,
        0
      );
      doc
        .fontSize(12)
        .font("Helvetica")
        .text(`Total Registrations: ${totalRegistrations}`);

      doc.moveDown(0.3);
      doc.text(`Hackathons: ${registrationCountsByHackathon.length}`);

      doc.moveDown(1.5);

      // Create pie chart data and images
      const chartJSNodeCanvas = new ChartJSNodeCanvas({
        width: 400,
        height: 300,
      });

      // Generate gender pie chart
      if (activeGenderCounts.length > 0) {
        doc.fontSize(14).font("Helvetica-Bold").text("Gender Distribution");
        doc.moveDown(0.5);

        const genderChartConfig = {
          type: "pie",
          data: {
            labels: activeGenderCounts.map((g) => g.gender || "Not Specified"),
            datasets: [
              {
                data: activeGenderCounts.map((g) => g.count),
                backgroundColor: [
                  "#FF6384",
                  "#36A2EB",
                  "#FFCE56",
                  "#4BC0C0",
                  "#9966FF",
                  "#FF9F40",
                ],
                borderColor: [
                  "#FF6384",
                  "#36A2EB",
                  "#FFCE56",
                  "#4BC0C0",
                  "#9966FF",
                  "#FF9F40",
                ],
                borderWidth: 2,
              },
            ],
          },
          options: {
            responsive: false,
            plugins: {
              legend: {
                position: "bottom" as const,
              },
            },
          },
        };

        const genderImage = await chartJSNodeCanvas.drawChart(genderChartConfig);
        doc.image(genderImage, {
          width: 350,
          align: "center",
        });
        doc.moveDown(1.5);
      }

      // Generate race pie chart
      if (activeRaceEthnicityCounts.length > 0) {
        doc.fontSize(14).font("Helvetica-Bold").text("Race/Ethnicity Distribution");
        doc.moveDown(0.5);

        const raceChartConfig = {
          type: "pie",
          data: {
            labels: activeRaceEthnicityCounts.map((r) => r.race || "Not Specified"),
            datasets: [
              {
                data: activeRaceEthnicityCounts.map((r) => r.count),
                backgroundColor: [
                  "#FF6384",
                  "#36A2EB",
                  "#FFCE56",
                  "#4BC0C0",
                  "#9966FF",
                  "#FF9F40",
                  "#FF6384",
                  "#36A2EB",
                  "#FFCE56",
                  "#4BC0C0",
                ],
                borderColor: [
                  "#FF6384",
                  "#36A2EB",
                  "#FFCE56",
                  "#4BC0C0",
                  "#9966FF",
                  "#FF9F40",
                  "#FF6384",
                  "#36A2EB",
                  "#FFCE56",
                  "#4BC0C0",
                ],
                borderWidth: 2,
              },
            ],
          },
          options: {
            responsive: false,
            plugins: {
              legend: {
                position: "bottom" as const,
              },
            },
          },
        };

        const raceImage = await chartJSNodeCanvas.drawChart(raceChartConfig);
        doc.image(raceImage, {
          width: 350,
          align: "center",
        });
        doc.moveDown(1.5);
      }

      // Generate academic year pie chart
      if (activeAcademicYearCounts.length > 0) {
        doc.fontSize(14).font("Helvetica-Bold").text("Academic Year Distribution");
        doc.moveDown(0.5);

        const academicYearChartConfig = {
          type: "pie",
          data: {
            labels: activeAcademicYearCounts.map(
              (a) => a.academicYear || "Not Specified"
            ),
            datasets: [
              {
                data: activeAcademicYearCounts.map((a) => a.count),
                backgroundColor: [
                  "#FF6384",
                  "#36A2EB",
                  "#FFCE56",
                  "#4BC0C0",
                  "#9966FF",
                ],
                borderColor: [
                  "#FF6384",
                  "#36A2EB",
                  "#FFCE56",
                  "#4BC0C0",
                  "#9966FF",
                ],
                borderWidth: 2,
              },
            ],
          },
          options: {
            responsive: false,
            plugins: {
              legend: {
                position: "bottom" as const,
              },
            },
          },
        };

        const academicYearImage = await chartJSNodeCanvas.drawChart(
          academicYearChartConfig
        );
        doc.image(academicYearImage, {
          width: 350,
          align: "center",
        });
        doc.moveDown(1.5);
      }

      // Generate coding experience pie chart
      if (activeCodingExpCounts.length > 0) {
        doc.fontSize(14).font("Helvetica-Bold").text("Coding Experience Distribution");
        doc.moveDown(0.5);

        const codingExpChartConfig = {
          type: "pie",
          data: {
            labels: activeCodingExpCounts.map(
              (c) => c.codingExperience || "Not Specified"
            ),
            datasets: [
              {
                data: activeCodingExpCounts.map((c) => c.count),
                backgroundColor: [
                  "#FF6384",
                  "#36A2EB",
                  "#FFCE56",
                  "#4BC0C0",
                  "#9966FF",
                ],
                borderColor: [
                  "#FF6384",
                  "#36A2EB",
                  "#FFCE56",
                  "#4BC0C0",
                  "#9966FF",
                ],
                borderWidth: 2,
              },
            ],
          },
          options: {
            responsive: false,
            plugins: {
              legend: {
                position: "bottom" as const,
              },
            },
          },
        };

        const codingExpImage = await chartJSNodeCanvas.drawChart(
          codingExpChartConfig
        );
        doc.image(codingExpImage, {
          width: 350,
          align: "center",
        });
      }

      // Finalize PDF
      doc.end();
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).send("Error generating PDF report");
    }
  }
}
