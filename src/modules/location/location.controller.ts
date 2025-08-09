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
  Query,
  UseFilters,
  ValidationPipe,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { Location, LocationEntity } from "entities/location.entity";
import { Hackathon } from "entities/hackathon.entity";
import { ApiTags, OmitType, PartialType, ApiProperty } from "@nestjs/swagger";
import { SocketGateway } from "modules/socket/socket.gateway";
import { Role, Roles } from "common/gcp";
import { ApiDoc } from "common/docs";
import { DBExceptionFilter } from "common/filters";
import { IsString } from "class-validator";

class LocationCreateEntity extends OmitType(LocationEntity, ["id"] as const) {
  hackathonId?: string; // Optional - defaults to active hackathon
}

class LocationPatchEntity extends PartialType(LocationCreateEntity) {}

class LocationQueryParams {
  @ApiProperty()
  @IsString()
  hackathonId: string;
}

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
  @ApiDoc({
    summary: "Find All Bookable Locations",
    response: {
      ok: { type: [LocationEntity] },
    },
  })
  async getAll(
    @Query(new ValidationPipe({ transform: true })) query: LocationQueryParams,
  ) {
    return this.locationRepo
      .findAll()
      .raw()
      .where("hackathonId", query.hackathonId)
      .where("isBookable", true);
  }

  @Get("/admin")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Find All Locations (Admin Only)",
    response: {
      ok: { type: [LocationEntity] },
    },
    auth: Role.TEAM,
  })
  async getAllAdmin(
    @Query(new ValidationPipe({ transform: true })) query: LocationQueryParams,
  ) {
    return this.locationRepo
      .findAll()
      .raw()
      .where("hackathonId", query.hackathonId);
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
    // Default to active hackathon if not provided
    if (!data.hackathonId) {
      const hackathon = await Hackathon.query().findOne({ active: true });
      if (!hackathon) throw new NotFoundException("No active hackathon found");
      data.hackathonId = hackathon.id;
    }

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
