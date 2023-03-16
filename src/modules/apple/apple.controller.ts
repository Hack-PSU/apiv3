import { Controller, Post, Query } from "@nestjs/common";
import { AppleAuthService } from "common/apple/apple-auth.service";

@Controller("apple")
export class AppleController {
  constructor(private readonly appleAuth: AppleAuthService) {}

  @Post("/auth/refresh")
  async refreshToken(@Query("code") code: string) {
    return this.appleAuth.refreshToken(code);
  }

  @Post("/auth/revoke")
  async revokeToken(@Query("refresh_token") refresh_token: string) {
    return this.appleAuth.revokeToken(refresh_token);
  }
}
