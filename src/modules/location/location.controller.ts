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
import { Location } from "entities/location.entity";
import { OmitType, PartialType } from "@nestjs/swagger";
import { SocketGateway } from "modules/socket/socket.gateway";

class CreateEntity extends OmitType(Location, ["id"] as const) {}

class PatchEntity extends PartialType(CreateEntity) {}

@Controller("locations")
export class LocationController {
  constructor(
    @InjectRepository(Location)
    private readonly locationRepo: Repository<Location>,
    private readonly socket: SocketGateway,
  ) {}

  @Get("/")
  async getAll() {
    return this.locationRepo.findAll();
  }

  @Post("/")
  async createOne(@Body("data") data: CreateEntity) {
    return this.locationRepo.withEmit(
      () => this.locationRepo.createOne(data),
      () => this.socket.emit("update:location", {}),
    );
  }

  @Get(":id")
  async getOne(@Param("id") id: number) {
    return this.locationRepo.findOne(id);
  }

  @Patch(":id")
  async patchOne(@Param("id") id: number, @Body("data") data: PatchEntity) {
    return this.locationRepo.withEmit(
      () => this.locationRepo.patchOne(id, data),
      () => this.socket.emit("update:location", {}),
    );
  }

  @Put(":id")
  async replaceOne(@Param("id") id: number, @Body("data") data: CreateEntity) {
    return this.locationRepo.withEmit(
      () => this.locationRepo.replaceOne(id, data),
      () => this.socket.emit("update:location", {}),
    );
  }

  @Delete(":id")
  async deleteOne(@Param("id") id: number) {
    return this.locationRepo.withEmit(
      () => this.locationRepo.deleteOne(id),
      () => this.socket.emit("update:location", {}),
    );
  }
}
