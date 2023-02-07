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
} from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { Event, EventEntity } from "entities/event.entity";
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOAuth2,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
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

class CreateEntity extends OmitType(EventEntity, ["id", "icon"] as const) {}

class PatchEntity extends PartialType(CreateEntity) {}

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
  @ApiOkResponse({ type: EventEntity })
  @ApiOperation({ summary: "Get All Events" })
  async getAll() {
    return this.eventRepo.findAll().byHackathon();
  }

  @Post("/")
  @UsePipes(new SanitizeFieldsPipe(["description"]))
  @UseInterceptors(FileInterceptor("icon"))
  @ApiOperation({ summary: "Create an Event" })
  @ApiCreatedResponse({ type: EventEntity })
  @ApiAuth(Role.TEAM)
  @ApiBody({ type: CreateEntity })
  async createOne(
    @Body("data") data: CreateEntity,
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
      .exec();

    this.socket.emit("create:event", event);

    return event;
  }

  @Get(":id")
  @ApiOperation({ summary: "Get an Event" })
  async getOne(@Param("id") id: string) {
    return this.eventRepo.findOne(id).exec();
  }

  @Patch(":id")
  @UseInterceptors(FileInterceptor("icon"))
  @ApiOperation({ summary: "Patch an Event" })
  @ApiBody({ type: PatchEntity })
  async patchOne(
    @Param("id") id: string,
    @Body("data") data: PatchEntity,
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
  @ApiBody({ type: CreateEntity })
  async replaceOne(
    @Param("id") id: string,
    @Body("data") data: CreateEntity,
    @UploadedIcon() icon?: Express.Multer.File,
  ) {
    let iconUrl = null;

    if (icon) {
      iconUrl = await this.eventService.uploadIcon(id, icon);
    }

    const event = await this.eventRepo
      .replaceOne(id, { ...data, ...(iconUrl ? { icon: iconUrl } : {}) })
      .exec();

    this.socket.emit("update:event", event);

    return event;
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete an Event" })
  async deleteOne(@Param("id") id: string) {
    const event = await this.eventRepo.deleteOne(id).exec();

    await this.eventService.deleteIcon(id);

    this.socket.emit("delete:event", event);

    return event;
  }

  @Post(":id/check-in")
  @HttpCode(HttpStatus.NO_CONTENT)
  async checkInEvent(
    @Param("id") id: string,
    @Body("data") data: CreateScanEntity,
  ) {
    const hasEvent = await this.eventRepo.findOne(id).exec();

    if (!hasEvent) {
      throw new HttpException("event not found", HttpStatus.BAD_REQUEST);
    }

    const { hackathonId, ...rest } = data;

    await this.scanRepo.createOne(rest).byHackathon(hackathonId);
  }
}
