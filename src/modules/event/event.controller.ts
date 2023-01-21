import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UsePipes,
} from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { Event } from "entities/event.entity";
import { OmitType, PartialType } from "@nestjs/swagger";
import { SanitizeFieldsPipe } from "common/pipes";
import { SocketGateway } from "modules/socket/socket.gateway";

class CreateEntity extends OmitType(Event, ["id"] as const) {}

class PatchEntity extends PartialType(CreateEntity) {}

@Controller("events")
export class EventController {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    private readonly socket: SocketGateway,
  ) {}

  @Get("/")
  async getAll() {
    return this.eventRepo.findAll().byHackathon();
  }

  @UsePipes(new SanitizeFieldsPipe(["description"]))
  @Post("/")
  async createOne(@Body("data") data: CreateEntity) {
    const event = await this.eventRepo.createOne(data).exec();
    this.socket.emit("create:event", event);

    return event;
  }

  @Get(":id")
  async getOne(@Param("id") id: string) {
    return this.eventRepo.findOne(id).exec();
  }

  @Patch(":id")
  async patchOne(@Param("id") id: string, @Body("data") data: PatchEntity) {
    const event = await this.eventRepo.patchOne(id, data).exec();
    this.socket.emit("update:event", event);

    return event;
  }

  @Put(":id")
  async replaceOne(@Param("id") id: string, @Body("data") data: CreateEntity) {
    const event = await this.eventRepo.replaceOne(id, data).exec();
    this.socket.emit("update:event", event);

    return event;
  }

  @Delete(":id")
  async deleteOne(@Param("id") id: string) {
    const event = await this.eventRepo.deleteOne(id).exec();
    this.socket.emit("delete:event", event);

    return event;
  }
}
