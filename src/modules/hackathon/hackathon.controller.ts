import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { Hackathon, HackathonEntity } from "entities/hackathon.entity";
import { OmitType, PartialType } from "@nestjs/swagger";
import { Role, Roles } from "common/gcp";
import { SocketGateway } from "modules/socket/socket.gateway";
import { Event } from "entities/event.entity";
import { nanoid } from "nanoid";

class UpdateEntity extends OmitType(HackathonEntity, ["id"] as const) {}

class CreateEntity extends OmitType(UpdateEntity, ["active"] as const) {}

class PatchEntity extends PartialType(UpdateEntity) {}

@Controller("hackathons")
export class HackathonController {
  constructor(
    @InjectRepository(Hackathon)
    private readonly hackathonRepo: Repository<Hackathon>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    private readonly socket: SocketGateway,
  ) {}

  @Get("/")
  @Roles(Role.TEAM)
  async getAll() {
    return this.hackathonRepo.findAll().exec();
  }

  @Post("/")
  async createOne(@Body() data: CreateEntity) {
    const newHackathonId = nanoid(32);

    await Hackathon.query().patch({ active: false }).where("active", true);

    const newHackathon = await this.hackathonRepo
      .createOne({
        ...data,
        id: newHackathonId,
        active: true,
      })
      .exec();

    const newCheckInEvent = await this.eventRepo
      .createOne({
        id: nanoid(),
        name: "Check-in",
        type: "checkIn",
        startTime: data.startTime,
        endTime: data.endTime,
        hackathonId: newHackathonId,
      })
      .exec();

    this.socket.emit("create:hackathon", newHackathon);

    return {
      ...newHackathon,
      checkInId: newCheckInEvent.id,
    };
  }

  @Get("/active")
  async getActive() {
    const hackathon = Hackathon.query().where("active", true);
    const checkIn = await Hackathon.relatedQuery<Event>("events")
      .for(hackathon)
      .where("type", "checkIn")
      .first();

    const activeHackathon = await hackathon;

    return {
      ...activeHackathon,
      checkInId: checkIn.id,
    };
  }

  @Get(":id")
  async getOne(@Param("id") id: string) {
    return this.hackathonRepo.findOne(id).exec();
  }

  @Patch(":id")
  async patchOne(@Param("id") id: string, @Body() data: PatchEntity) {
    const hackathon = await this.hackathonRepo.patchOne(id, data).exec();
    this.socket.emit("update:hackathon", hackathon);

    return hackathon;
  }

  @Put(":id")
  async replaceOne(@Param("id") id: string, @Body() data: UpdateEntity) {
    const hackathon = await this.hackathonRepo.replaceOne(id, data).exec();
    this.socket.emit("update:hackathon", hackathon);

    return hackathon;
  }

  @Delete(":id")
  async deleteOne(@Param("id") id: string) {
    const hackathon = await this.hackathonRepo.deleteOne(id).exec();
    this.socket.emit("delete:hackathon", hackathon);

    return hackathon;
  }

  @Post(":id/active")
  async markActive(@Param("id") id: string) {
    // mark current as inactive
    await Hackathon.query().patch({ active: false }).where("active", true);

    // mark new hackathon as active
    const hackathon = await this.hackathonRepo
      .patchOne(id, { active: true })
      .exec();

    this.socket.emit("update:hackathon", hackathon);

    return hackathon;
  }
}
