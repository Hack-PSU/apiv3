import { Controller, HttpStatus, Post, Query } from "@nestjs/common";
import { AppleAuthService } from "common/apple/apple-auth.service";
import { ApiTags } from "@nestjs/swagger";
import { ApiDoc, BadRequestExceptionResponse } from "common/docs";
import { Role, Roles } from "common/gcp";

@ApiTags("Apple")
@Controller("apple")
export class AppleController {
  constructor(private readonly appleAuth: AppleAuthService) {}

  @Post("/auth/refresh")
  @Roles(Role.NONE)
  @ApiDoc({
    summary: "Get Apple Auth Refresh Token",
    auth: Role.NONE,
    response: {
      ok: { type: String },
      custom: [
        {
          status: HttpStatus.BAD_REQUEST,
          type: BadRequestExceptionResponse,
        },
      ],
    },
  })
  async refreshToken(@Query("code") code: string) {
    return this.appleAuth.refreshToken(code);
  }

  @Post("/auth/revoke")
  @Roles(Role.NONE)
  @ApiDoc({
    summary: "Revoke Apple Sign In Auth Token",
    auth: Role.NONE,
    response: {
      ok: { type: Boolean },
      custom: [
        {
          status: HttpStatus.BAD_REQUEST,
          type: BadRequestExceptionResponse,
        },
      ],
    },
  })
  async revokeToken(@Query("refresh_token") refresh_token: string) {
    return this.appleAuth.revokeToken(refresh_token);
  }
}
