import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseInterceptors,
  UsePipes,
} from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { Event, EventEntity } from "entities/event.entity";
import { OmitType, PartialType } from "@nestjs/swagger";
import { SanitizeFieldsPipe } from "common/pipes";
import { SocketGateway } from "modules/socket/socket.gateway";
import { nanoid } from "nanoid";
import { FileInterceptor } from "@nestjs/platform-express";
import { UploadedIcon } from "modules/event/uploaded-icon.decorator";
import { Express } from "express";
import { EventService } from "modules/event/event.service";

class CreateEntity extends OmitType(EventEntity, ["id", "icon"] as const) {}

class PatchEntity extends PartialType(CreateEntity) {}

@Controller("events")
export class EventController {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    private readonly socket: SocketGateway,
    private readonly eventService: EventService,
  ) {}

  @Get("/")
  async getAll() {
    return this.eventRepo.findAll().byHackathon();
  }

  @Post("/")
  @UsePipes(new SanitizeFieldsPipe(["description"]))
  @UseInterceptors(FileInterceptor("icon"))
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
  async getOne(@Param("id") id: string) {
    return this.eventRepo.findOne(id).exec();
  }

  @Patch(":id")
  @UseInterceptors(FileInterceptor("icon"))
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
  async deleteOne(@Param("id") id: string) {
    const event = await this.eventRepo.deleteOne(id).exec();

    await this.eventService.deleteIcon(id);

    this.socket.emit("delete:event", event);

    return event;
  }
}
