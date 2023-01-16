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

class CreateEntity extends OmitType(Event, ["id"] as const) {}

class PatchEntity extends PartialType(CreateEntity) {}

@Controller("events")
export class EventController {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
  ) {}

  @Get("/")
  async getAll() {
    return this.eventRepo.findAll();
  }

  @UsePipes(new SanitizeFieldsPipe(["description"]))
  @Post("/")
  async createOne(@Body("data") data: CreateEntity) {
    return this.eventRepo.createOne(data);
  }

  @Get(":id")
  async getOne(@Param("id") id: string) {
    return this.eventRepo.findOne(id, false);
  }

  @Patch(":id")
  async patchOne(@Param("id") id: string, @Body("data") data: PatchEntity) {
    return this.eventRepo.patchOne(id, data, false);
  }

  @Put(":id")
  async replaceOne(@Param("id") id: string, @Body("data") data: CreateEntity) {
    return this.eventRepo.replaceOne(id, data, false);
  }

  @Delete(":id")
  async deleteOne(@Param("id") id: string) {
    return this.eventRepo.deleteOne(id, false);
  }
}
