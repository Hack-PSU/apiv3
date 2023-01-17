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
    return this.eventRepo.findAll();
  }

  @UsePipes(new SanitizeFieldsPipe(["description"]))
  @Post("/")
  async createOne(@Body("data") data: CreateEntity) {
    return this.eventRepo.withEmit(
      () => this.eventRepo.createOne(data),
      () => this.socket.emit("update:event", {}),
    );
  }

  @Get(":id")
  async getOne(@Param("id") id: string) {
    return this.eventRepo.findOne(id, false);
  }

  @Patch(":id")
  async patchOne(@Param("id") id: string, @Body("data") data: PatchEntity) {
    return this.eventRepo.withEmit(
      () => this.eventRepo.patchOne(id, data, false),
      () => this.socket.emit("update:event", {}),
    );
  }

  @Put(":id")
  async replaceOne(@Param("id") id: string, @Body("data") data: CreateEntity) {
    return this.eventRepo.withEmit(
      () => this.eventRepo.replaceOne(id, data, false),
      () => this.socket.emit("update:event", {}),
    );
  }

  @Delete(":id")
  async deleteOne(@Param("id") id: string) {
    return this.eventRepo.withEmit(
      () => this.eventRepo.deleteOne(id, false),
      () => this.socket.emit("update:event", {}),
    );
  }
}
