import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseFilters,
  UseInterceptors,
  ValidationPipe,
} from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { Event, EventEntity } from "entities/event.entity";
import { ApiProperty, ApiTags, OmitType, PartialType } from "@nestjs/swagger";
import { SanitizeFieldsPipe } from "common/pipes";
import { SocketGateway } from "modules/socket/socket.gateway";
import { nanoid } from "nanoid";
import { FileInterceptor } from "@nestjs/platform-express";
import { UploadedIcon } from "modules/event/uploaded-icon.decorator";
import { Express } from "express";
import { EventService } from "modules/event/event.service";
import { Scan, ScanEntity } from "entities/scan.entity";
import { Role, Roles } from "common/gcp";
import { ApiDoc } from "common/docs";
import { DBExceptionFilter } from "common/filters";

class EventCreateEntity extends OmitType(EventEntity, ["id", "icon"] as const) {
  @ApiProperty({ type: "string", format: "binary", required: false })
  icon?: any;
}

class EventPatchEntity extends PartialType(EventCreateEntity) {}

class CreateScanEntity extends OmitType(ScanEntity, [
  "id",
  "eventId",
  "userId",
] as const) {}

@ApiTags("Events")
@Controller("events")
@UseFilters(DBExceptionFilter)
export class EventController {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(Scan)
    private readonly scanRepo: Repository<Scan>,
    private readonly socket: SocketGateway,
    private readonly eventService: EventService,
  ) {}

  @Get("/")
  @Roles(Role.NONE)
  @ApiDoc({
    summary: "Get All Events",
    query: [
      {
        name: "hackathonId",
        required: false,
        description: "A valid hackathon ID",
      },
    ],
    response: {
      ok: { type: [EventEntity] },
    },
    auth: Role.NONE,
  })
  async getAll(@Query("hackathonId") hackathonId?: string) {
    return this.eventRepo.findAll().byHackathon(hackathonId);
  }

  @Post("/")
  @Roles(Role.TEAM)
  @UseInterceptors(FileInterceptor("icon"))
  @ApiDoc({
    summary: "Create an Event",
    request: {
      mimeTypes: ["multipart/form-data"],
      body: { type: EventCreateEntity },
      validate: true,
    },
    response: {
      created: { type: EventEntity },
    },
    auth: Role.TEAM,
  })
  async createOne(
    @Body(
      new SanitizeFieldsPipe(["description"]),
      new ValidationPipe({
        forbidNonWhitelisted: true,
        whitelist: true,
        transform: true,
      }),
    )
    data: EventCreateEntity,
    @UploadedIcon() icon?: Express.Multer.File,
  ) {
    const eventId = nanoid();
    let iconUrl = null;

    if (icon) {
      iconUrl = await this.eventService.uploadIcon(eventId, icon);
    }

    const event = await this.eventRepo
      .createOne({
        id: eventId,
        icon: iconUrl,
        ...data,
      })
      .byHackathon(data.hackathonId);

    this.socket.emit("create:event", event);

    return event;
  }

  @Get(":id")
  @Roles(Role.NONE)
  @ApiDoc({
    summary: "Get an Event",
    params: [
      {
        name: "id",
        description: "ID must be set to an event's ID",
      },
    ],
    response: {
      ok: { type: EventEntity },
    },
    auth: Role.NONE,
  })
  async getOne(@Param("id") id: string) {
    return this.eventRepo.findOne(id).exec();
  }

  @Patch(":id")
  @Roles(Role.TEAM)
  @UseInterceptors(FileInterceptor("icon"))
  @ApiDoc({
    summary: "Patch an Event",
    params: [
      {
        name: "id",
        description: "ID must be set to an event's iD",
      },
    ],
    request: {
      mimeTypes: ["multipart/form-data"],
      body: { type: EventPatchEntity },
      validate: true,
    },
    response: {
      ok: { type: EventEntity },
    },
    auth: Role.TEAM,
  })
  async patchOne(
    @Param("id") id: string,
    @Body(
      new SanitizeFieldsPipe(["description"]),
      new ValidationPipe({
        forbidNonWhitelisted: true,
        whitelist: true,
        transform: true,
      }),
    )
    data: EventPatchEntity,
    @UploadedIcon() icon?: Express.Multer.File,
  ) {
    let iconUrl = null;

    if (icon) {
      // delete if replacing the icon
      await this.eventService.deleteIcon(id);
      iconUrl = await this.eventService.uploadIcon(id, icon);
    }

    const event = await this.eventRepo
      .patchOne(id, { ...data, ...(iconUrl ? { icon: iconUrl } : {}) })
      .exec();

    this.socket.emit("update:event", event);

    return event;
  }

  @Put(":id")
  @Roles(Role.TEAM)
  @UseInterceptors(FileInterceptor("icon"))
  @ApiDoc({
    summary: "Replace an Event",
    params: [
      {
        name: "id",
        description: "ID must be set to an event's ID",
      },
    ],
    request: {
      mimeTypes: ["multipart/form-data"],
      body: { type: EventCreateEntity },
      validate: true,
    },
    response: {
      ok: { type: EventEntity },
    },
    auth: Role.TEAM,
  })
  async replaceOne(
    @Param("id") id: string,
    @Body(
      new SanitizeFieldsPipe(["description"]),
      new ValidationPipe({
        forbidNonWhitelisted: true,
        whitelist: true,
        transform: true,
      }),
    )
    data: EventCreateEntity,
    @UploadedIcon() icon?: Express.Multer.File,
  ) {
    let iconUrl = null;

    // delete all icons from event
    await this.eventService.deleteIcon(id);

    if (icon) {
      iconUrl = await this.eventService.uploadIcon(id, icon);
    }

    const event = await this.eventRepo
      .replaceOne(id, { ...data, icon: iconUrl })
      .exec();

    this.socket.emit("update:event", event);

    return event;
  }

  @Delete(":id")
  @Roles(Role.TEAM)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDoc({
    summary: "Delete an Event",
    params: [
      {
        name: "id",
        description: "ID must be set to an event's ID",
      },
    ],
    response: {
      noContent: true,
    },
    auth: Role.TEAM,
  })
  async deleteOne(@Param("id") id: string) {
    const event = await this.eventRepo.deleteOne(id).exec();

    await this.eventService.deleteIcon(id);

    this.socket.emit("delete:event", event);

    return event;
  }

  @Post(":id/check-in/user/:userId")
  @Roles(Role.TEAM)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDoc({
    summary: "Check-In by Event",
    params: [
      {
        name: "id",
        description: "ID must be set to an event's ID",
      },
      {
        name: "userId",
        description: "ID must be set to a user's ID",
      },
    ],
    request: {
      body: { type: CreateScanEntity },
      validate: true,
    },
    response: {
      noContent: true,
    },
    auth: Role.TEAM,
  })
  async checkInEvent(
    @Param("id") id: string,
    @Param("userId") userId: string,
    @Body(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        whitelist: true,
        transform: true,
      }),
    )
    data: CreateScanEntity,
  ) {
    const hasEvent = await this.eventRepo.findOne(id).exec();

    if (!hasEvent) {
      throw new HttpException("event not found", HttpStatus.BAD_REQUEST);
    }

    await this.scanRepo
      .createOne({
        ...data,
        userId,
        eventId: id,
      })
      .byHackathon(data.hackathonId);
  }
}
