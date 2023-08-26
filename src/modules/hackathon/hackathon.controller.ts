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
  UseFilters,
  ValidationPipe,
} from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { Hackathon, HackathonEntity } from "entities/hackathon.entity";
import {
  ApiExtraModels,
  ApiProperty,
  ApiTags,
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
import { SponsorEntity } from "entities/sponsor.entity";
import { ApiDoc } from "common/docs";
import { DBExceptionFilter } from "common/filters";

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

class StaticEventLocationEntity {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;
}

class StaticEventEntity extends EventEntity {
  @ApiProperty({ type: StaticEventLocationEntity })
  location: StaticEventLocationEntity;
}

class StaticActiveHackathonEntity extends HackathonEntity {
  @ApiProperty({ type: [EventEntity] })
  events: StaticEventEntity[];

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
@UseFilters(DBExceptionFilter)
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
        ...(checkIn ? { checkInId: checkIn.id } : {}),
      },
    ];
  }

  @Get("/")
  @Roles(Role.NONE)
  @ApiDoc({
    summary: "Get All Hackathons",
    query: [
      {
        name: "active",
        type: ActiveHackathonParams,
      },
    ],
    response: {
      ok: { type: ConditionalHackathonResponse },
    },
  })
  async getAll(
    @Query(new ValidationPipe({ transform: true }))
    { active }: ActiveHackathonParams,
  ) {
    if (active === undefined) {
      console.log(this.hackathonRepo.findAll().raw().toKnexQuery().toSQL().sql);
      const asdfasdf = this.hackathonRepo.findAll().exec();
      console.log("waiting.");
      const stuff = await asdfasdf;
      console.log(stuff);
      return asdfasdf;
    } else if (active === true) {
      return this.getActiveHackathon();
    } else {
      return this.hackathonRepo.findAll().raw().where("active", false);
    }
  }

  @Post("/")
  @Roles(Role.EXEC)
  @ApiDoc({
    summary: "Create a Hackathon",
    request: {
      body: { type: HackathonCreateEntity },
      validate: true,
    },
    response: {
      created: { type: HackathonResponse },
    },
    auth: Role.EXEC,
  })
  async createOne(
    @Body(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        whitelist: true,
        transform: true,
      }),
    )
    data: HackathonCreateEntity,
  ) {
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
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Get a Hackathon",
    params: [
      {
        name: "id",
        description: "ID must be set to a hackathon's ID",
      },
    ],
    response: {
      ok: { type: HackathonEntity },
    },
    auth: Role.TEAM,
  })
  async getOne(@Param("id") id: string) {
    return this.hackathonRepo.findOne(id).exec();
  }

  @Patch(":id")
  @Roles(Role.EXEC)
  @ApiDoc({
    summary: "Patch a Hackathon",
    params: [
      {
        name: "id",
        description: "ID must be set to a hackathon's ID",
      },
    ],
    request: {
      body: { type: HackathonPatchEntity },
      validate: true,
    },
    response: {
      ok: { type: HackathonEntity },
    },
    auth: Role.EXEC,
  })
  async patchOne(
    @Param("id") id: string,
    @Body(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        whitelist: true,
        transform: true,
      }),
    )
    data: HackathonPatchEntity,
  ) {
    const hackathon = await this.hackathonRepo.patchOne(id, data).exec();
    this.socket.emit("update:hackathon", hackathon);

    return hackathon;
  }

  @Put(":id")
  @Roles(Role.EXEC)
  @ApiDoc({
    summary: "Replace a Hackathon",
    params: [
      {
        name: "id",
        description: "ID must be set to a hackathon's ID",
      },
    ],
    request: {
      body: { type: HackathonUpdateEntity },
      validate: true,
    },
    response: {
      ok: { type: HackathonEntity },
    },
    auth: Role.EXEC,
  })
  async replaceOne(
    @Param("id") id: string,
    @Body(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        whitelist: true,
        transform: true,
      }),
    )
    data: HackathonUpdateEntity,
  ) {
    const hackathon = await this.hackathonRepo.replaceOne(id, data).exec();
    this.socket.emit("update:hackathon", hackathon);

    return hackathon;
  }

  @Delete(":id")
  @Roles(Role.EXEC)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDoc({
    summary: "Delete a Hackathon",
    params: [
      {
        name: "id",
        description: "ID must be set to a hackathon's ID",
      },
    ],
    response: {
      noContent: true,
    },
    auth: Role.EXEC,
  })
  async deleteOne(@Param("id") id: string) {
    const hackathon = await this.hackathonRepo.deleteOne(id).exec();
    this.socket.emit("delete:hackathon", hackathon);

    return hackathon;
  }

  @Patch(":id/active")
  @Roles(Role.EXEC)
  @ApiDoc({
    summary: "Mark Active Hackathon",
    params: [
      {
        name: "id",
        description: "ID must be set to a hackathon's ID",
      },
    ],
    response: {
      ok: { type: HackathonEntity },
    },
    auth: Role.EXEC,
  })
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
  @ApiDoc({
    summary: "Get Active Hackathon For Static",
    response: {
      ok: { type: StaticActiveHackathonEntity },
    },
  })
  async getForStatic() {
    return Hackathon.query()
      .findOne({ active: true })
      .withGraphFetched("[events.location, sponsors]");
  }
}
