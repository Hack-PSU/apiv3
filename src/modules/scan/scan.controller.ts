import { Controller, Get, Param } from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { Scan, ScanEntity } from "entities/scan.entity";
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiTags,
} from "@nestjs/swagger";
import { ApiAuth } from "common/docs/api-auth";
import { RestrictedRoles, Role, Roles } from "common/gcp";
import { Event, EventEntity } from "entities/event.entity";
import { Organizer } from "entities/organizer.entity";
import { Hackathon } from "entities/hackathon.entity";

class AnalyticsEventsScansEntity extends EventEntity {
  @ApiProperty({ type: [ScanEntity] })
  scans: ScanEntity[];
}

// Endpoint will be used specifically for statistics
// Creating a scan must be created from either an event or a user
@ApiTags("Scans")
@Controller("scans")
@ApiExtraModels(AnalyticsEventsScansEntity)
export class ScanController {
  constructor(
    @InjectRepository(Scan)
    private readonly scanRepo: Repository<Scan>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(Organizer)
    private readonly organizerRepo: Repository<Organizer>,
  ) {}

  @Get("/")
  @Roles(Role.TEAM)
  @ApiOperation({ summary: "Get All Scans" })
  @ApiOkResponse({ type: [ScanEntity] })
  @ApiAuth(Role.TEAM)
  async getAll() {
    return this.scanRepo.findAll().byHackathon();
  }

  @Get(":id")
  @Roles(Role.TEAM)
  @ApiOperation({ summary: "Get One Scan" })
  @ApiParam({ name: "id", description: "ID must be set to a scan's ID" })
  @ApiOkResponse({ type: ScanEntity })
  @ApiAuth(Role.TEAM)
  async getOne(@Param("id") id: number) {
    return this.scanRepo.findOne(id).exec();
  }

  @Get("analytics/organizers")
  @Roles(Role.EXEC)
  async getAllByOrganizer() {
    return this.organizerRepo
      .findAll()
      .raw()
      .withGraphJoined("scans")
      .where(
        "scans.hackathonId",
        Hackathon.query().findOne({ active: true }).select("hackathons.id"),
      );
  }

  @Get("analytics/organizers/:id")
  @RestrictedRoles({
    roles: [Role.TEAM],
    predicate: (req) => req.user && req.user.sub === req.params.id,
  })
  @Roles(Role.EXEC)
  async getByUser(@Param("id") id: string) {
    return this.scanRepo.findAll().byHackathon().where("organizerId", id);
  }

  @Get("analytics/events")
  @Roles(Role.TEAM)
  @ApiOperation({ summary: "Get All Scans For All Events" })
  @ApiOkResponse({ type: AnalyticsEventsScansEntity })
  @ApiAuth(Role.TEAM)
  async getAllByEvent() {
    return this.eventRepo.findAll().byHackathon().withGraphFetched("scans");
  }

  @Get("analytics/events/:id")
  @Roles(Role.TEAM)
  @ApiOperation({ summary: "Get All Scans for an Event" })
  @ApiParam({ name: "id", description: "ID must be set to an event's ID" })
  @ApiOkResponse({ type: [ScanEntity] })
  @ApiAuth(Role.TEAM)
  async getByEvent(@Param("id") id: string) {
    return this.scanRepo.findAll().byHackathon().where("eventId", id);
  }
}
