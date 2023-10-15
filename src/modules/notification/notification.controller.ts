import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Req,
  UnauthorizedException,
  ValidationPipe,
} from "@nestjs/common";
import { DefaultTopic, FirebaseMessagingService } from "common/gcp/messaging";
import {
  BroadcastMessageEntity,
  UserMessageEntity,
} from "modules/notification/notification.interface";
import { Role, Roles } from "common/gcp";
import { ApiDoc, BadRequestExceptionResponse } from "common/docs";
import { Request } from "express";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("Notifications")
@Controller("notifications")
export class NotificationController {
  constructor(private readonly fcmService: FirebaseMessagingService) {}

  @Post("send")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Send a Notification to a User",
    request: {
      body: { type: UserMessageEntity },
      validate: true,
    },
    response: {
      noContent: true,
    },
    dbException: false,
    auth: Role.TEAM,
  })
  async sendMessage(
    @Body(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        whitelist: true,
        transform: true,
      }),
    )
    message: UserMessageEntity,
  ) {
    const { userId, ...payload } = message;

    return this.fcmService.sendTokenMessage(userId, {
      ...payload,
      isClickable: payload.metadata && payload.metadata.link,
    });
  }

  @Post("broadcast")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Broadcast Notification to a Topic",
    request: {
      body: { type: BroadcastMessageEntity },
      validate: true,
    },
    response: {
      noContent: true,
      custom: [
        {
          status: HttpStatus.BAD_REQUEST,
          type: BadRequestExceptionResponse,
        },
      ],
    },
    dbException: false,
    auth: Role.TEAM,
  })
  async broadcastMessage(
    @Body(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        whitelist: true,
        transform: true,
      }),
    )
    message: BroadcastMessageEntity,
  ) {
    const { topic, broadcast, ...payload } = message;

    if (!broadcast && !topic) {
      throw new HttpException("Unable to find target", HttpStatus.BAD_REQUEST);
    }

    return this.fcmService.sendTopicMessage(broadcast || topic, {
      ...payload,
      isClickable: payload.metadata && payload.metadata.link,
    });
  }

  @Post("/register/device/:deviceId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.NONE)
  @ApiDoc({
    summary: "Register Mobile User Device to Notifications Service",
    auth: Role.NONE,
    params: [
      {
        name: "deviceId",
        description: "ID must be set to a valid FCM token",
      },
    ],
    response: {
      noContent: true,
    },
  })
  async registerUser(@Req() req: Request, @Param("deviceId") deviceId: string) {
    if (!req.user || !("sub" in req.user)) {
      throw new UnauthorizedException();
    }

    const userId = String(req.user.sub);

    await this.fcmService.register(userId, deviceId);
    await this.fcmService.subscribeTo(deviceId, DefaultTopic.ALL);
  }
}
