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
import { Registration, ApplicationStatus } from "entities/registration.entity";
import { GotifyService } from "common/gotify/gotify.service";
import { PipeTransform, Injectable } from "@nestjs/common";

@Injectable()
class StringBooleanPipe implements PipeTransform {
  transform(value: any) {
    // Convert string "true"/"false" to actual booleans before other pipes process it
    if (value && typeof value === "object" && "fastPass" in value) {
      if (typeof value.fastPass === "string") {
        value.fastPass = value.fastPass === "true";
      }
    }
    return value;
  }
}

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
    private readonly gotifyService: GotifyService,
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
      new StringBooleanPipe(),
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
        fastPass: false,
      })
      .byHackathon(data.hackathonId)
      .withGraphFetched("location");

    this.socket.emit("create:event", event);

    if (data.fastPass) {
      const fastPassEventId = nanoid();
      const fastPassIconUrl = icon
        ? await this.eventService.uploadIcon(fastPassEventId, icon)
        : iconUrl;
      const fastPassEventName = `(Fast Pass) ${data.name}`;

      const fastPassEvent = await this.eventRepo
        .createOne({
          id: fastPassEventId,
          icon: fastPassIconUrl,
          ...data,
          fastPass: true,
          name: fastPassEventName,
        })
        .byHackathon(data.hackathonId)
        .withGraphFetched("location");

      this.socket.emit("create:event", fastPassEvent);
    }

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
    const [event, user, userRegistration] = await Promise.all([
      this.eventRepo.findOne(id).exec(),
      this.userRepo.findOne(userId).exec(),
      this.registrationRepo
        .findAll()
        .byHackathon(data.hackathonId)
        .where("userId", userId)
        .first(),
    ]);

    if (!event) {
      throw new HttpException("event not found", HttpStatus.BAD_REQUEST);
    }

    if (!user) {
      throw new HttpException("user not found", HttpStatus.BAD_REQUEST);
    }

    if (!userRegistration) {
      throw new HttpException(
        "User is not registered for the current hackathon",
        HttpStatus.BAD_REQUEST,
      );
    }

    if (userRegistration.applicationStatus !== ApplicationStatus.CONFIRMED) {
      throw new HttpException(
        `User is not confirmed. status: ${userRegistration.applicationStatus}`,
        HttpStatus.FORBIDDEN,
      );
    }

    if (event.type != EventType.checkIn) {
      const checkInEvent = await this.eventRepo
        .findAll()
        .byHackathon(data.hackathonId)
        .where("type", EventType.checkIn)
        .first();

      if (!checkInEvent) {
        throw new HttpException(
          "Check-in event not found",
          HttpStatus.BAD_REQUEST,
        );
      }

      const checkInScan = await this.scanRepo
        .findAll()
        .byHackathon(data.hackathonId)
        .where("eventId", checkInEvent.id)
        .where("userId", userId)
        .first();

      if (!checkInScan) {
        throw new HttpException(
          "User has not checked-in to the hackathon",
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    if (event.fastPass) {
      const numEventsDone = await this.scanRepo
        .findAll()
        .byHackathon(data.hackathonId)
        .joinRelated("event")
        .where("userId", userId)
        .whereIn("event.type", [EventType.workshop, EventType.activity])
        .resultSize();

      if (numEventsDone < 3) {
        throw new HttpException(
          "User has not completed at least 3 events",
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    await this.scanRepo
      .createOne({
        ...data,
        userId,
        eventId: id,
        timestamp: Date.now(),
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
