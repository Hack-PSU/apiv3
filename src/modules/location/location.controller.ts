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
    return this.locationRepo.findAll().exec();
  }

  @Post("/")
  async createOne(@Body("data") data: CreateEntity) {
    const location = await this.locationRepo.createOne(data).exec();
    this.socket.emit("create:location", location);

    return location;
  }

  @Get(":id")
  async getOne(@Param("id") id: number) {
    return this.locationRepo.findOne(id).exec();
  }

  @Patch(":id")
  async patchOne(@Param("id") id: number, @Body("data") data: PatchEntity) {
    const location = await this.locationRepo.patchOne(id, data).exec();
    this.socket.emit("update:location", location);

    return location;
  }

  @Put(":id")
  async replaceOne(@Param("id") id: number, @Body("data") data: CreateEntity) {
    const location = await this.locationRepo.replaceOne(id, data).exec();
    this.socket.emit("update:location", location);

    return location;
  }

  @Delete(":id")
  async deleteOne(@Param("id") id: number) {
    const location = await this.locationRepo.deleteOne(id).exec();
    this.socket.emit("delete:location", location);

    return location;
  }
}
