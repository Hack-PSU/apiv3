import { Controller, Get, Param } from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { Scan } from "entities/scan.entity";

// Endpoint will be used specifically for statistics
// Creating a scan must be created from either an event or a user
@Controller("scans")
export class ScanController {
  constructor(
    @InjectRepository(Scan)
    private readonly scanRepo: Repository<Scan>,
  ) {}

  @Get("/")
  async getAll() {
    return this.scanRepo.findAll().byHackathon();
  }

  @Get(":id")
  async getOne(@Param("id") id: number) {
    return this.scanRepo.findOne(id).exec();
  }

  @Get("organizer/:id")
  async getByUser(@Param("id") id: string) {
    return this.scanRepo.findAll().byHackathon().where("organizerId", id);
  }

  @Get("event/:id")
  async getByEvent(@Param("id") id: string) {
    return this.scanRepo.findAll().byHackathon().where("eventId", id);
  }
}
