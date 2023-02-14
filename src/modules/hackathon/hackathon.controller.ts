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
  Query,
  ValidationPipe,
} from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { Hackathon, HackathonEntity } from "entities/hackathon.entity";
import {
  ApiBody,
  ApiExtraModels,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiQuery,
  ApiTags,
  getSchemaPath,
  IntersectionType,
  OmitType,
  PartialType,
} from "@nestjs/swagger";
import { Role, Roles } from "common/gcp";
import { SocketGateway } from "modules/socket/socket.gateway";
import { Event, EventEntity } from "entities/event.entity";
import { nanoid } from "nanoid";
import { IsOptional } from "class-validator";
import { Transform } from "class-transformer";
import { ApiAuth } from "common/docs/api-auth";
import { SponsorEntity } from "entities/sponsor.entity";

class HackathonUpdateEntity extends OmitType(HackathonEntity, [
  "id",
] as const) {}

class HackathonCreateEntity extends OmitType(HackathonUpdateEntity, [
  "active",
] as const) {}

class HackathonPatchEntity extends PartialType(HackathonUpdateEntity) {}

class HackathonCheckInResponse {
  @ApiProperty({
    description: "Included when active is set to true",
  })
  checkInId?: string;
}

class ConditionalHackathonResponse extends IntersectionType(
  HackathonEntity,
  PartialType(HackathonCheckInResponse),
) {}

class HackathonResponse extends IntersectionType(
  HackathonEntity,
  HackathonCheckInResponse,
) {}

class StaticActiveHackathonEntity extends HackathonEntity {
  @ApiProperty({ type: [EventEntity] })
  events: EventEntity[];

  @ApiProperty({ type: [SponsorEntity] })
  sponsors: SponsorEntity[];
}

class ActiveHackathonParams {
  @ApiProperty({
    required: false,
    description: "active can either be a boolean or undefined",
  })
  @IsOptional()
  @Transform(({ value }) => {
    switch (value) {
      case "true":
        return true;
      case "false":
        return false;
      default:
        return undefined;
    }
  })
  active?: boolean;
}

@ApiTags("Hackathons")
@Controller("hackathons")
@ApiExtraModels(StaticActiveHackathonEntity)
export class HackathonController {
  constructor(
    @InjectRepository(Hackathon)
    private readonly hackathonRepo: Repository<Hackathon>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    private readonly socket: SocketGateway,
  ) {}

  private async getActiveHackathon() {
    const hackathon = Hackathon.query().findOne({ active: true });
    const checkIn = await Hackathon.relatedQuery<Event>("events")
      .for(hackathon)
      .where("type", "checkIn")
      .first();

    const activeHackathon = await hackathon;

    return [
      {
        ...activeHackathon,
        checkInId: checkIn.id,
      },
    ];
  }

  @Get("/")
  @ApiOperation({ summary: "Get All Hackathons" })
  @ApiQuery({ name: "active", type: ActiveHackathonParams })
  @ApiOkResponse({ type: ConditionalHackathonResponse })
  @ApiAuth(Role.TEAM)
  @Roles(Role.TEAM)
  async getAll(
    @Query(new ValidationPipe({ transform: true }))
    { active }: ActiveHackathonParams,
  ) {
    if (active === undefined) {
      return this.hackathonRepo.findAll().exec();
    } else if (active === true) {
      return this.getActiveHackathon();
    } else {
      return this.hackathonRepo.findAll().raw().where("active", false);
    }
  }

  @Post("/")
  @ApiOperation({ summary: "Create a Hackathon" })
  @ApiOkResponse({ type: HackathonResponse })
  @ApiBody({ type: HackathonCreateEntity })
  @ApiAuth(Role.EXEC)
  async createOne(@Body() data: HackathonCreateEntity) {
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

  @Get(":id")
  @ApiOperation({ summary: "Get a Hackathon" })
  @ApiParam({ name: "id", description: "ID must be set to a hackathon's ID" })
  @ApiOkResponse({ type: HackathonEntity })
  @ApiAuth(Role.TEAM)
  async getOne(@Param("id") id: string) {
    return this.hackathonRepo.findOne(id).exec();
  }

  @Patch(":id")
  @ApiOperation({ summary: "Patch a Hackathon" })
  @ApiParam({ name: "id", description: "ID must be set to a hackaton's ID" })
  @ApiOkResponse({ type: HackathonEntity })
  @ApiAuth(Role.EXEC)
  async patchOne(@Param("id") id: string, @Body() data: HackathonPatchEntity) {
    const hackathon = await this.hackathonRepo.patchOne(id, data).exec();
    this.socket.emit("update:hackathon", hackathon);

    return hackathon;
  }

  @Put(":id")
  @ApiOperation({ summary: "Replace a Hackathon" })
  @ApiParam({ name: "id", description: "ID must be set to a hackathon's ID" })
  @ApiOkResponse({ type: HackathonEntity })
  @ApiAuth(Role.EXEC)
  async replaceOne(
    @Param("id") id: string,
    @Body() data: HackathonUpdateEntity,
  ) {
    const hackathon = await this.hackathonRepo.replaceOne(id, data).exec();
    this.socket.emit("update:hackathon", hackathon);

    return hackathon;
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a Hackathon" })
  @ApiParam({ name: "id", description: "ID must be set to a hackathon's ID" })
  @ApiNoContentResponse()
  @ApiAuth(Role.EXEC)
  async deleteOne(@Param("id") id: string) {
    const hackathon = await this.hackathonRepo.deleteOne(id).exec();
    this.socket.emit("delete:hackathon", hackathon);

    return hackathon;
  }

  @Patch(":id/active")
  @ApiOperation({ summary: "Mark Active Hackathon" })
  @ApiParam({ name: "id", description: "ID must be set to a hackathon's ID" })
  @ApiOkResponse({ type: HackathonEntity })
  @ApiAuth(Role.EXEC)
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

  @Get("/active/static")
  @ApiOperation({ summary: "Get Active Hackathon For Static" })
  @ApiOkResponse({ type: StaticActiveHackathonEntity })
  @ApiAuth(Role.NONE)
  async getForStatic() {
    return Hackathon.query()
      .findOne({ active: true })
      .withGraphFetched("[events, sponsors]");
  }
}
