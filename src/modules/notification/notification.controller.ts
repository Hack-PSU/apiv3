import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  ValidationPipe,
} from "@nestjs/common";
import { FirebaseMessagingService } from "common/gcp/messaging";
import {
  BroadcastMessageEntity,
  UserMessageEntity,
} from "modules/notification/notification.interface";
import { Role, Roles } from "common/gcp";
import { ApiDoc } from "common/docs";

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
}
