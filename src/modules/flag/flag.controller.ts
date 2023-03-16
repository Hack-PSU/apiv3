import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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

@Controller("flags")
export class FlagController {
  constructor(private readonly flagService: FeatureFlagService) {}

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
