import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UseFilters,
  ValidationPipe,
} from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { Location, LocationEntity } from "@entities/location.entity";
import { ApiTags, OmitType, PartialType } from "@nestjs/swagger";
import { SocketGateway } from "modules/socket/socket.gateway";
import { Role, Roles } from "common/gcp";
import { ApiDoc } from "common/docs";
import { DBExceptionFilter } from "common/filters";

class LocationCreateEntity extends OmitType(LocationEntity, ["id"] as const) {}

class LocationPatchEntity extends PartialType(LocationCreateEntity) {}

@ApiTags("Locations")
@Controller("locations")
@UseFilters(DBExceptionFilter)
export class LocationController {
  constructor(
    @InjectRepository(Location)
    private readonly locationRepo: Repository<Location>,
    private readonly socket: SocketGateway,
  ) {}

  @Get("/")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Find All Locations",
    response: {
      ok: { type: [LocationEntity] },
    },
    auth: Role.TEAM,
  })
  async getAll() {
    return this.locationRepo.findAll().exec();
  }

  @Post("/")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Create a Location",
    request: {
      body: { type: LocationCreateEntity },
      validate: true,
    },
    response: {
      created: { type: LocationEntity },
    },
    auth: Role.TEAM,
  })
  async createOne(
    @Body(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        whitelist: true,
        transform: true,
      }),
    )
    data: LocationCreateEntity,
  ) {
    const location = await this.locationRepo.createOne(data).exec();
    this.socket.emit("create:location", location);

    return location;
  }

  @Get(":id")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Get a Location",
    params: [
      {
        name: "id",
        description: "ID must be set to a location's ID",
      },
    ],
    response: {
      ok: { type: LocationEntity },
    },
    auth: Role.TEAM,
  })
  async getOne(@Param("id", ParseIntPipe) id: number) {
    return this.locationRepo.findOne(id).exec();
  }

  @Patch(":id")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Patch a Location",
    params: [
      {
        name: "id",
        description: "ID must be set to a location's ID",
      },
    ],
    request: {
      body: { type: LocationPatchEntity },
      validate: true,
    },
    response: {
      ok: { type: LocationEntity },
    },
    auth: Role.TEAM,
  })
  async patchOne(
    @Param("id", ParseIntPipe) id: number,
    @Body(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        whitelist: true,
        transform: true,
      }),
    )
    data: LocationPatchEntity,
  ) {
    const location = await this.locationRepo.patchOne(id, data).exec();
    this.socket.emit("update:location", location);

    return location;
  }

  @Put(":id")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Replace a Location",
    params: [
      {
        name: "id",
        description: "ID must be set to a location's ID",
      },
    ],
    request: {
      body: { type: LocationCreateEntity },
      validate: true,
    },
    response: {
      ok: { type: LocationEntity },
    },
    auth: Role.TEAM,
  })
  async replaceOne(
    @Param("id", ParseIntPipe) id: number,
    @Body(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        whitelist: true,
        transform: true,
      }),
    )
    data: LocationCreateEntity,
  ) {
    const location = await this.locationRepo.replaceOne(id, data).exec();
    this.socket.emit("update:location", location);

    return location;
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Delete a Location",
    params: [
      {
        name: "id",
        description: "ID must be set to a location's ID",
      },
    ],
    response: {
      noContent: true,
    },
    auth: Role.TEAM,
  })
  async deleteOne(@Param("id", ParseIntPipe) id: number) {
    const location = await this.locationRepo.deleteOne(id).exec();
    this.socket.emit("delete:location", location);

    return location;
  }
}
