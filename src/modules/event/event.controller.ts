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
  Req,
  UnauthorizedException,
  UseFilters,
  UseInterceptors,
  ValidationPipe,
} from "@nestjs/common";
import { InjectRepository, Repository } from "common/objection";
import { Event, EventEntity, EventType } from "entities/event.entity";
import {
  ApiExtraModels,
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
import { Express, Request } from "express";
import { EventService } from "modules/event/event.service";
import { Scan, ScanEntity } from "entities/scan.entity";
import { Role, Roles } from "common/gcp";
import { ApiDoc, BadRequestExceptionResponse } from "common/docs";
import { DBExceptionFilter } from "common/filters";
import { FirebaseMessagingService } from "common/gcp/messaging";
import { User } from "entities/user.entity";
import { LocationEntity } from "entities/location.entity";
import { Registration } from "entities/registration.entity";

class EventEntityResponse extends OmitType(EventEntity, ["wsUrls"] as const) {
  @ApiProperty({ type: [String] })
  wsUrls: string[];

  @ApiProperty({ type: LocationEntity })
  location: LocationEntity;
}

class EventCreateEntity extends OmitType(EventEntity, ["id", "icon"] as const) {
  @ApiProperty({ type: "string", format: "binary", required: false })
  icon?: any;
}

class EventPatchEntity extends PartialType(EventCreateEntity) {}

class CreateScanEntity extends OmitType(ScanEntity, [
  "eventId",
  "userId",
] as const) {}

@ApiTags("Events")
@Controller("events")
@ApiExtraModels(EventEntityResponse)
@UseFilters(DBExceptionFilter)
export class EventController {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(Scan)
    private readonly scanRepo: Repository<Scan>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Registration)
    private readonly registrationRepo: Repository<Registration>,
    private readonly fcmService: FirebaseMessagingService,
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
      ok: { type: [EventEntityResponse] },
    },
    auth: Role.NONE,
  })
  async getAll(@Query("hackathonId") hackathonId?: string) {
    return this.eventRepo
      .findAll()
      .byHackathon(hackathonId)
      .withGraphFetched("location");
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
      created: { type: EventEntityResponse },
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
      .byHackathon(data.hackathonId)
      .withGraphFetched("location");

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
      ok: { type: EventEntityResponse },
    },
    auth: Role.NONE,
  })
  async getOne(@Param("id") id: string) {
    return this.eventRepo.findOne(id).raw().withGraphFetched("location");
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
      ok: { type: EventEntityResponse },
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
      .raw()
      .withGraphFetched("location");

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
      ok: { type: EventEntityResponse },
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
      .raw()
      .withGraphFetched("location");

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

  @Post(":id/notifications/subscribe")
  @Roles(Role.NONE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDoc({
    summary: "Subscribe User to Event",
    params: [
      {
        name: "id",
        description: "ID must be set to an event's ID",
      },
    ],
    auth: Role.NONE,
    response: {
      noContent: true,
      custom: [
        {
          status: HttpStatus.BAD_REQUEST,
          type: BadRequestExceptionResponse,
        },
      ],
    },
  })
  async subscribeToEvent(@Req() req: Request, @Param("id") eventId: string) {
    if (!req.user || !("sub" in req.user)) {
      throw new UnauthorizedException();
    }

    const userId = String(req.user.sub);
    const success = await this.fcmService.subscribeUsingId(userId, eventId);

    if (!success) {
      throw new HttpException(
        "Unable to subscribe user to event",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(":id/notifications/unsubscribe")
  @Roles(Role.NONE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDoc({
    summary: "Unsubscribe User From Event",
    params: [
      {
        name: "id",
        description: "ID must be set to an event's ID",
      },
    ],
    auth: Role.NONE,
    response: {
      noContent: true,
      custom: [
        {
          status: HttpStatus.BAD_REQUEST,
          type: BadRequestExceptionResponse,
        },
      ],
    },
  })
  async unsubscribeFromEvent(
    @Req() req: Request,
    @Param("id") eventId: string,
  ) {
    if (!req.user || !("sub" in req.user)) {
      throw new UnauthorizedException();
    }

    const userId = String(req.user.sub);
    const success = await this.fcmService.unsubscribeUsingId(userId, eventId);

    if (!success) {
      throw new HttpException(
        "Unable to unsubscribe user from event",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(":id/check-in/user/:userId")
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
    dbException: true,
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
    const event = await this.eventRepo.findOne(id).exec();
    const user = await this.userRepo.findOne(userId).exec();

    if (!event) {
      throw new HttpException("event not found", HttpStatus.BAD_REQUEST);
    }

    if (!user) {
      throw new HttpException("user not found", HttpStatus.BAD_REQUEST);
    }

    // check if user is registered for the current hackathon
    const registration = await this.registrationRepo.findAll().exec();
    const userRegistration = registration
      .filter((r) => r.userId == userId)
      .filter((r) => r.hackathonId == data.hackathonId)[0];
    console.log("user registration", userRegistration);

    if (!userRegistration) {
      throw new HttpException(
        "User is not registered for the current hackathon",
        HttpStatus.BAD_REQUEST,
      );
    }

    if (event.type != EventType.checkIn) {
      // Find check-in event
      const checkInEvent = await (await this.eventRepo.findAll().exec())
        .filter((e) => e.type == EventType.checkIn)
        .filter((e) => e.hackathonId == data.hackathonId)[0];

      if (!checkInEvent) {
        throw new HttpException(
          "Check-in event not found",
          HttpStatus.BAD_REQUEST,
        );
      }

      const events = await this.scanRepo.findAll().exec();
      const checkInScan = events.filter(
        (e) =>
          e.eventId == checkInEvent.id &&
          e.userId == userId &&
          e.hackathonId == data.hackathonId,
      )[0];

      if (!checkInScan) {
        throw new HttpException(
          "User has not checked-in to the hackathon",
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    await this.scanRepo
      .createOne({
        ...data,
        userId,
        eventId: id,
      })
      .byHackathon(data.hackathonId);

    try {
      await this.fcmService.sendTokenMessage(userId, {
        title: "Check-in",
        body: `You have just checked-in to ${event.name}`,
      });
    } catch (e) {
      console.error(`Cannot send token message to: ${userId}`, e);
    }
  }
}
