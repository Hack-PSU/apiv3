import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
} from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { Location, LocationEntity } from "entities/location.entity";
import {
  ApiBody,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiTags,
  OmitType,
  PartialType,
} from "@nestjs/swagger";
import { SocketGateway } from "modules/socket/socket.gateway";
import { ApiAuth } from "common/docs/api-auth";
import { Role, Roles } from "common/gcp";

class LocationCreateEntity extends OmitType(LocationEntity, ["id"] as const) {}

class LocationPatchEntity extends PartialType(LocationCreateEntity) {}

@ApiTags("Locations")
@Controller("locations")
export class LocationController {
  constructor(
    @InjectRepository(Location)
    private readonly locationRepo: Repository<Location>,
    private readonly socket: SocketGateway,
  ) {}

  @Get("/")
  @Roles(Role.TEAM)
  @ApiOperation({ summary: "Find All Locations" })
  @ApiOkResponse({ type: [LocationEntity] })
  @ApiAuth(Role.TEAM)
  async getAll() {
    return this.locationRepo.findAll().exec();
  }

  @Post("/")
  @Roles(Role.TEAM)
  @ApiOperation({ summary: "Create a Location" })
  @ApiBody({ type: LocationCreateEntity })
  @ApiOkResponse({ type: LocationEntity })
  @ApiAuth(Role.TEAM)
  async createOne(@Body("data") data: LocationCreateEntity) {
    const location = await this.locationRepo.createOne(data).exec();
    this.socket.emit("create:location", location);

    return location;
  }

  @Get(":id")
  @Roles(Role.TEAM)
  @ApiOperation({ summary: "Get a Location" })
  @ApiParam({ name: "id", description: "ID must be set to location's ID" })
  @ApiOkResponse({ type: LocationEntity })
  @ApiAuth(Role.TEAM)
  async getOne(@Param("id") id: number) {
    return this.locationRepo.findOne(id).exec();
  }

  @Patch(":id")
  @Roles(Role.TEAM)
  @ApiOperation({ summary: "Patch a Location" })
  @ApiParam({ name: "id", description: "ID must set to location's ID" })
  @ApiBody({ type: LocationPatchEntity })
  @ApiOkResponse({ type: LocationEntity })
  @ApiAuth(Role.TEAM)
  async patchOne(@Param("id") id: number, @Body() data: LocationPatchEntity) {
    const location = await this.locationRepo.patchOne(id, data).exec();
    this.socket.emit("update:location", location);

    return location;
  }

  @Put(":id")
  @Roles(Role.TEAM)
  @ApiOperation({ summary: "Replace a Location" })
  @ApiParam({ name: "id", description: "ID must be set to location's ID" })
  @ApiBody({ type: LocationCreateEntity })
  @ApiOkResponse({ type: LocationEntity })
  @ApiAuth(Role.TEAM)
  async replaceOne(
    @Param("id") id: number,
    @Body() data: LocationCreateEntity,
  ) {
    const location = await this.locationRepo.replaceOne(id, data).exec();
    this.socket.emit("update:location", location);

    return location;
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.TEAM)
  @ApiOperation({ summary: "Delete a Location" })
  @ApiParam({ name: "id", description: "ID must be set to location's ID" })
  @ApiNoContentResponse()
  @ApiAuth(Role.TEAM)
  async deleteOne(@Param("id") id: number) {
    const location = await this.locationRepo.deleteOne(id).exec();
    this.socket.emit("delete:location", location);

    return location;
  }
}
