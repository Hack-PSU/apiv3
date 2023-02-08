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
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { Event, EventEntity } from "entities/event.entity";
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiTags,
  OmitType,
  PartialType,
} from "@nestjs/swagger";
import { SanitizeFieldsPipe } from "common/pipes";
import { SocketGateway } from "modules/socket/socket.gateway";
import { nanoid } from "nanoid";
import { FileInterceptor } from "@nestjs/platform-express";
import { UploadedIcon } from "modules/event/uploaded-icon.decorator";
import { Express } from "express";
import { EventService } from "modules/event/event.service";
import { Scan, ScanEntity } from "entities/scan.entity";
import { ApiAuth } from "common/docs/api-auth";
import { Role } from "common/gcp";
import * as mime from "mime-types";
import { Hackathon } from "entities/hackathon.entity";

class EventCreateEntity extends OmitType(EventEntity, ["id", "icon"] as const) {
  @ApiProperty({ type: "string", format: "binary", required: false })
  icon?: any;
}

class EventPatchEntity extends PartialType(EventCreateEntity) {}

class CreateScanEntity extends OmitType(ScanEntity, [
  "id",
  "hackathonId",
  "eventId",
] as const) {
  hackathonId?: string;
}

@ApiTags("Events")
@Controller("events")
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
  @ApiOperation({ summary: "Get All Events" })
  @ApiOkResponse({ type: [EventEntity] })
  @ApiAuth(Role.NONE)
  async getAll() {
    return this.eventRepo.findAll().byHackathon();
  }

  @Post("/")
  @UseInterceptors(FileInterceptor("icon"))
  @ApiOperation({ summary: "Create an Event" })
  @ApiConsumes("multipart/form-data")
  @ApiCreatedResponse({ type: EventEntity })
  @ApiAuth(Role.TEAM)
  @ApiBody({ type: EventCreateEntity })
  async createOne(
    @Body(
      new SanitizeFieldsPipe(["description"]),
      new ValidationPipe({ transform: true, forbidUnknownValues: false }),
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
      .byHackathon();

    this.socket.emit("create:event", event);

    return event;
  }

  @Get(":id")
  @ApiOperation({ summary: "Get an Event" })
  @ApiOkResponse({ type: EventEntity })
  @ApiParam({ name: "id", description: "ID must be set to the event's ID" })
  @ApiAuth(Role.NONE)
  async getOne(@Param("id") id: string) {
    return this.eventRepo.findOne(id).exec();
  }

  @Patch(":id")
  @UseInterceptors(FileInterceptor("icon"))
  @ApiOperation({ summary: "Patch an Event" })
  @ApiBody({ type: EventPatchEntity })
  @ApiConsumes("multipart/form-data")
  @ApiParam({ name: "id", description: "ID must be set to the event's ID" })
  @ApiOkResponse({ type: EventEntity })
  @ApiAuth(Role.TEAM)
  async patchOne(
    @Param("id") id: string,
    @Body(
      new SanitizeFieldsPipe(["description"]),
      new ValidationPipe({ transform: true, forbidUnknownValues: false }),
    )
    data: EventPatchEntity,
    @UploadedIcon() icon?: Express.Multer.File,
  ) {
    let iconUrl = null;

    if (icon) {
      iconUrl = await this.eventService.uploadIcon(id, icon);
    }

    const event = await this.eventRepo
      .patchOne(id, { ...data, ...(iconUrl ? { icon: iconUrl } : {}) })
      .exec();

    this.socket.emit("update:event", event);

    return event;
  }

  @Put(":id")
  @UseInterceptors(FileInterceptor("icon"))
  @ApiOperation({ summary: "Replace an Event" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({ type: EventCreateEntity })
  @ApiParam({ name: "id", description: "ID must be set to the event's ID" })
  @ApiOkResponse({ type: EventEntity })
  @ApiAuth(Role.TEAM)
  async replaceOne(
    @Param("id") id: string,
    @Body(
      new SanitizeFieldsPipe(["description"]),
      new ValidationPipe({ transform: true, forbidUnknownValues: false }),
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
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete an Event" })
  @ApiNoContentResponse()
  @ApiParam({ name: "id", description: "ID must be set to the event's ID" })
  @ApiAuth(Role.TEAM)
  async deleteOne(@Param("id") id: string) {
    const event = await this.eventRepo.deleteOne(id).exec();

    await this.eventService.deleteIcon(id);

    this.socket.emit("delete:event", event);

    return event;
  }

  @Post(":id/check-in")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Check-In by Event" })
  @ApiBody({ type: CreateScanEntity })
  @ApiParam({ name: "id", description: "ID must be set to the event's ID" })
  @ApiNoContentResponse()
  @ApiAuth(Role.TEAM)
  async checkInEvent(@Param("id") id: string, @Body() data: CreateScanEntity) {
    const hasEvent = await this.eventRepo.findOne(id).exec();

    if (!hasEvent) {
      throw new HttpException("event not found", HttpStatus.BAD_REQUEST);
    }

    const { hackathonId, ...rest } = data;

    await this.scanRepo.createOne(rest).byHackathon(hackathonId);
  }
}
