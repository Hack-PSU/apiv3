import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  ValidationPipe,
} from "@nestjs/common";
import { FeatureFlagService } from "common/flags/feature-flag.service";
import {
  ActivateFlagBody,
  FlagEntity,
  PatchFlagsBody,
} from "modules/flag/flag.interface";
import { Role, Roles } from "common/gcp";
import { ApiDoc, BadRequestExceptionResponse } from "common/docs";
import { ApiTags } from "@nestjs/swagger";
import { SocketGateway } from "modules/socket/socket.gateway";

@ApiTags("Feature Flags")
@Controller("flags")
export class FlagController {
  constructor(
    private readonly flagService: FeatureFlagService,
    private readonly socket: SocketGateway,
  ) {}

  @Get("/")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Get all feature flags",
    response: {
      ok: { type: [FlagEntity] },
    },
    auth: Role.TEAM,
  })
  async getAll() {
    const flagDocs = await this.flagService.allFlags();
    return flagDocs.map((flag) => ({
      name: flag.name,
      isEnabled: flag.isEnabled,
    }));
  }

  @Get("/state/:id")
  @Roles(Role.TEAM)
  @ApiDoc({
    summary: "Get the state of a feature flag",
    params: [
      {
        name: "id",
        description: "ID must be set to a valid flag ID or name.",
      },
    ],
    response: {
      ok: { type: FlagEntity },
    },
    auth: Role.TEAM,
  })
  async getOne(@Param("id") flagId: string) {
    const allFlags = await this.flagService.allFlags();
    return allFlags.filter((f) => f.name === flagId);
  }

  @Post("/toggle")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.EXEC)
  @ApiDoc({
    summary: "Activate a feature flag",
    auth: Role.EXEC,
    request: {
      body: { type: ActivateFlagBody },
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
  })
  async activateFlag(
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    data: ActivateFlagBody,
  ) {
    const success = await this.flagService.activate(data.name, data.isEnabled);

    if (!success) {
      throw new BadRequestException("Flag does not exist");
    }

    if (data.broadcast) {
      this.socket.emit(`update:${data.name}:flag`, {}, data.broadcast);
    }
  }

  @Patch("/")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.EXEC)
  @ApiDoc({
    summary: "Patch Multiple Flags",
    auth: Role.EXEC,
    request: {
      body: { type: PatchFlagsBody },
      validate: true,
    },
    response: {
      noContent: true,
    },
  })
  async patchFlags(
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    data: PatchFlagsBody,
  ) {
    return this.flagService.patch(data.flags);
  }
}
