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
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { Readable } from "stream";

const PDFDocument = require("pdfkit");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");

const RACE_CATEGORIES: { label: string; patterns: string[] }[] = [
  { label: "Asian", patterns: ["asian"] },
  { label: "Caucasian", patterns: ["caucasian", "white"] },
  { label: "Hispanic or Latinx", patterns: ["hispanic", "latinx"] },
  { label: "Black or African American", patterns: ["black or african american", "african american"] },
  { label: "Native American or Alaska Native", patterns: ["native american", "alaska native"] },
  { label: "Native Hawaiian or Other Pacific Islander", patterns: ["native hawaiian", "pacific islander"] },
  { label: "Prefer not to disclose", patterns: ["nodisclose", "prefer not to disclose"] },
  { label: "Multiracial", patterns: ["multiracial"] },
];

// Helper to save canvas to PNG file
async function saveCanvasToPNG(canvas: any, filepath: string): Promise<void> {
  try {
    // Try to get buffer from canvas - different canvas implementations have different APIs
    let buffer: Buffer;

    if (typeof canvas.toBuffer === "function") {
      buffer = canvas.toBuffer("image/png");
    } else if (canvas && typeof canvas.toBuffer === "function") {
      buffer = canvas.toBuffer();
    } else if (canvas.canvas && typeof canvas.canvas.toBuffer === "function") {
      buffer = canvas.canvas.toBuffer("image/png");
    } else {
      throw new Error(
        `Canvas object has no toBuffer method. Available methods: ${Object.getOwnPropertyNames(Object.getPrototypeOf(canvas)).join(", ")}`,
      );
    }

    fs.writeFileSync(filepath, buffer);
  } catch (error) {
    throw new Error(`Failed to save canvas to PNG: ${error.message}`);
  }
}

class CountsResponse {
  @ApiProperty()
  count: number;
}

enum Allergen {
  PEANUT = "Peanut",
  TREE_NUT = "Tree Nut",
  DAIRY = "Dairy",
  SHELLFISH = "Shellfish",
  GLUTEN = "Gluten",
  EGG = "Egg",
  MEAT = "Meat",
  SOY = "Soy",
  FISH = "Fish",
  SESAME = "Sesame",
  OTHER = "Other",
}

const allergenKeywords: Record<Allergen, string[]> = {
  [Allergen.PEANUT]: ["peanut", "peanuts"],
  [Allergen.TREE_NUT]: ["almond", "walnut", "cashew", "pecan"],
  [Allergen.DAIRY]: ["dairy", "milk", "lactose"],
  [Allergen.EGG]: ["egg", "eggs"],
  [Allergen.SHELLFISH]: ["shrimp", "crab", "lobster", "shellfish"],
  [Allergen.FISH]: ["fish"],
  [Allergen.MEAT]: ["meat", "beef", "pork", "chicken", "turkey"],
  [Allergen.GLUTEN]: ["gluten", "wheat"],
  [Allergen.SOY]: ["soy"],
  [Allergen.SESAME]: ["sesame"],
  [Allergen.OTHER]: [],
};

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

class AllergenCounts extends CountsResponse {
  @ApiProperty()
  allergen: Allergen;
}

class ApplicationMetrics {
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

class AnalyticsApplicationsResponse {
  @ApiProperty({ type: ApplicationMetrics })
  pennState: ApplicationMetrics;

  @ApiProperty({ type: ApplicationMetrics })
  other: ApplicationMetrics;
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

  @ApiProperty({ type: [AllergenCounts] })
  allergens: AllergenCounts[];
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
  private async getRaceCounts(): Promise<RaceCounts[]> {
    const results = await Promise.all(
      RACE_CATEGORIES.map(async ({ label, patterns }) => {
        const whereClause = patterns
          .map(() => "LOWER(race) LIKE ?")
          .join(" OR ");
        const result = (await this.userRepo
          .findAll()
          .byHackathon()
          .whereRaw(`(${whereClause})`, patterns.map((p) => `%${p}%`))
          .count("users.id", { as: "count" })
          .first()) as any;
        return { race: label, count: Number(result?.count ?? 0) };
      }),
    );
    return results.filter((r) => r.count > 0);
  }

  private parseAllergens(
    allergyEntries: { allergies: string }[],
  ): AllergenCounts[] {
    const allergenCounts: Record<Allergen, number> = {
      [Allergen.PEANUT]: 0,
      [Allergen.TREE_NUT]: 0,
      [Allergen.DAIRY]: 0,
      [Allergen.SHELLFISH]: 0,
      [Allergen.GLUTEN]: 0,
      [Allergen.EGG]: 0,
      [Allergen.MEAT]: 0,
      [Allergen.SOY]: 0,
      [Allergen.FISH]: 0,
      [Allergen.SESAME]: 0,
      [Allergen.OTHER]: 0,
    };

    for (const entry of allergyEntries) {
      const allergyText = entry.allergies.toLowerCase();
      let matched = false;

      // Check each allergen category against the keywords
      for (const [allergen, keywords] of Object.entries(allergenKeywords)) {
        if (keywords.some((keyword) => allergyText.includes(keyword))) {
          allergenCounts[allergen as Allergen]++;
          matched = true;
          break;
        }
      }

      // If no keywords matched, count as OTHER
      if (!matched) {
        allergenCounts[Allergen.OTHER]++;
      }
    }

    // Convert counts object to array format
    return Object.entries(allergenCounts).map(([allergen, count]) => ({
      allergen: allergen as Allergen,
      count,
    }));
  }
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
  @Roles(Role.NONE)
  @ApiDoc({
    summary: "Get analytics summary for current hackathon",
    auth: Role.NONE,
    response: {
      ok: { type: AnalyticsSummaryResponse },
    },
  })
  async getSummary() {
    // get all registration counts by hackathon
    const registrationCountsByHackathon = await Hackathon.query()
      .joinRelated("registrations")
      .count("registrations.hackathonId", { as: "count" })
      .groupBy("hackathons.id", "hackathons.name", "hackathons.start_time")
      .orderBy("hackathons.startTime")
      .select("hackathons.id", "hackathons.name");

    // get all gender counts for active hackathon
    const activeGenderCounts = await this.userRepo
      .findAll()
      .byHackathon()
      .count("gender", { as: "count" })
      .groupBy("gender")
      .select("gender");

    // get race counts for active hackathon using per-category LIKE queries
    const activeRaceEthnicityCounts = await this.getRaceCounts();

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

    const activeAllergies = await this.userRepo
      .findAll()
      .byHackathon()
      .where("allergies", "!=", "")
      .select("allergies");

    const allergenCounts = this.parseAllergens(activeAllergies);

    return {
      registrations: registrationCountsByHackathon,
      gender: activeGenderCounts,
      race: activeRaceEthnicityCounts,
      academicYear: activeAcademicYearCounts,
      codingExp: activeCodingExpCounts,
      allergens: allergenCounts,
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

  private async calculateApplicationMetrics(
    applications: any[],
  ): Promise<ApplicationMetrics> {
    const confirmedApplicants = applications.filter(
      (app) => app.applicationStatus === "confirmed",
    );
    const declinedApplicants = applications.filter(
      (app) => app.applicationStatus === "declined",
    );
    const acceptedApplicants = applications.filter(
      (app) => app.applicationStatus === "accepted",
    );

    const totalAccepted =
      confirmedApplicants.length +
      declinedApplicants.length +
      acceptedApplicants.length;

    const confirmedAndScannedApplicants = await this.scanRepo
      .findAll()
      .byHackathon()
      .joinRelated("event")
      .whereIn(
        "user_id",
        confirmedApplicants.map((app) => app.userId),
      )
      .where("event.type", "checkIn")
      .groupBy("user_id")
      .select("user_id");

    return {
      attendanceRate:
        confirmedApplicants.length > 0
          ? confirmedAndScannedApplicants.length / confirmedApplicants.length
          : 0,
      confirmRate:
        totalAccepted > 0
          ? confirmedApplicants.length / totalAccepted
          : 0,
      averageConfirmTime:
        confirmedApplicants.length > 0
          ? confirmedApplicants.reduce(
              (acc, app) => acc + (app.rsvpAt - app.acceptedAt),
              0,
            ) / confirmedApplicants.length
          : 0,
      acceptanceTotal: totalAccepted,
      acceptanceRate:
        applications.length > 0 ? totalAccepted / applications.length : 0,
    };
  }

  @Get("/applications")
  @Roles(Role.NONE)
  @ApiDoc({
    summary: "Get application metrics for each event",
    auth: Role.TEAM,
    response: {
      ok: { type: AnalyticsApplicationsResponse },
    },
  })
  async getApplicationAnalytics() {
    const PENN_STATE_UNIVERSITY =
      "The Pennsylvania State University - Main Campus";

    // Get all registrations with user information for the active hackathon
    const applications = await this.registrationRepo
      .findAll()
      .byHackathon()
      .withGraphFetched("user");

    // Separate Penn State and Other students
    const pennStateApps = applications.filter(
      (app) => app.user.university === PENN_STATE_UNIVERSITY,
    );
    const otherApps = applications.filter(
      (app) => app.user.university !== PENN_STATE_UNIVERSITY,
    );

    const pennStateMetrics = await this.calculateApplicationMetrics(
      pennStateApps,
    );

    const otherMetrics = await this.calculateApplicationMetrics(otherApps);

    return {
      pennState: pennStateMetrics,
      other: otherMetrics,
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

      const activeRaceEthnicityCounts = await this.getRaceCounts();

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
        'attachment; filename="analytics-report.pdf"',
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
        .text(`Generated on ${new Date().toLocaleString()}`, {
          align: "center",
        });

      doc.moveDown(1.5);

      // Add summary metrics
      doc.fontSize(16).font("Helvetica-Bold").text("Summary Metrics");
      doc.moveDown(0.5);

      const totalRegistrations = registrationCountsByHackathon.reduce(
        (sum, r) => sum + r.count,
        0,
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

        const genderImagePath = path.join(os.tmpdir(), "gender-chart.png");
        const genderCanvas =
          await chartJSNodeCanvas.renderChart(genderChartConfig);
        await saveCanvasToPNG(genderCanvas, genderImagePath);
        doc.image(genderImagePath, { width: 350 });
        fs.unlinkSync(genderImagePath);
        doc.moveDown(1.5);
      }

      // Generate race pie chart
      if (activeRaceEthnicityCounts.length > 0) {
        doc
          .fontSize(14)
          .font("Helvetica-Bold")
          .text("Race/Ethnicity Distribution");
        doc.moveDown(0.5);

        const raceChartConfig = {
          type: "pie",
          data: {
            labels: activeRaceEthnicityCounts.map(
              (r) => r.race || "Not Specified",
            ),
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

        const raceImagePath = path.join(os.tmpdir(), "race-chart.png");
        const raceCanvas = await chartJSNodeCanvas.renderChart(raceChartConfig);
        await saveCanvasToPNG(raceCanvas, raceImagePath);
        doc.image(raceImagePath, { width: 350 });
        fs.unlinkSync(raceImagePath);
        doc.moveDown(1.5);
      }

      // Generate academic year pie chart
      if (activeAcademicYearCounts.length > 0) {
        doc
          .fontSize(14)
          .font("Helvetica-Bold")
          .text("Academic Year Distribution");
        doc.moveDown(0.5);

        const academicYearChartConfig = {
          type: "pie",
          data: {
            labels: activeAcademicYearCounts.map(
              (a) => a.academicYear || "Not Specified",
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

        const academicYearImagePath = path.join(
          os.tmpdir(),
          "academic-year-chart.png",
        );
        const academicYearCanvas = await chartJSNodeCanvas.renderChart(
          academicYearChartConfig,
        );
        await saveCanvasToPNG(academicYearCanvas, academicYearImagePath);
        doc.image(academicYearImagePath, { width: 350 });
        fs.unlinkSync(academicYearImagePath);
        doc.moveDown(1.5);
      }

      // Generate coding experience pie chart
      if (activeCodingExpCounts.length > 0) {
        doc
          .fontSize(14)
          .font("Helvetica-Bold")
          .text("Coding Experience Distribution");
        doc.moveDown(0.5);

        const codingExpChartConfig = {
          type: "pie",
          data: {
            labels: activeCodingExpCounts.map(
              (c) => c.codingExperience || "Not Specified",
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

        const codingExpImagePath = path.join(
          os.tmpdir(),
          "coding-exp-chart.png",
        );
        const codingExpCanvas =
          await chartJSNodeCanvas.renderChart(codingExpChartConfig);
        await saveCanvasToPNG(codingExpCanvas, codingExpImagePath);
        doc.image(codingExpImagePath, { width: 350 });
        fs.unlinkSync(codingExpImagePath);
      }

      // Finalize PDF
      doc.end();
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).send("Error generating PDF report");
    }
  }
}
