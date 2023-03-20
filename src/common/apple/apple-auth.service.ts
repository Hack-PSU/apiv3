import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { AppleAuthConfigProvider } from "common/apple/apple-auth.constants";
import { AppleAuthConfig } from "common/apple/apple-auth.types";
import * as jwt from "jsonwebtoken";
import { DateTime } from "luxon";
import { HttpService } from "@nestjs/axios";
import { catchError, map } from "rxjs";
import * as qs from "qs";

@Injectable()
export class AppleAuthService {
  constructor(
    @Inject(AppleAuthConfigProvider)
    private readonly appleAuthConfig: AppleAuthConfig,
    private readonly httpService: HttpService,
  ) {}

  private async createClientSecret() {
    return jwt.sign(
      {
        iss: this.appleAuthConfig.iss,
        iat: Math.floor(DateTime.now().toMillis()),
        exp: Math.floor(DateTime.now().toMillis()) + 120,
        aud: this.appleAuthConfig.aud,
        sub: this.appleAuthConfig.sub,
      },
      this.appleAuthConfig.pk,
      {
        algorithm: "ES256",
        header: {
          alg: "ES256",
          kid: this.appleAuthConfig.kid,
        },
      },
    );
  }

  async refreshToken(code: string) {
    const clientSecret = this.createClientSecret();

    const data = {
      code: code,
      client_id: "org.hackpsu.prod", // matches AppleAuthConfig.sub
      client_secret: clientSecret,
      grant_type: "authorization_code",
    };

    return this.httpService
      .post(`https://appleid.apple.com/auth/token`, qs.stringify(data), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      })
      .pipe(
        map((resp) => resp.data.refresh_token),
        catchError(() => {
          throw new BadRequestException("Invalid authorization code");
        }),
      );
  }

  async revokeToken(refreshToken: string) {
    const clientSecret = this.createClientSecret();

    const data = {
      token: refreshToken,
      client_id: "org.hackpsu.prod",
      client_secret: clientSecret,
      token_type_hint: "refresh_token",
    };

    return this.httpService
      .post("https://appleid.apple.com/auth/revoke", qs.stringify(data), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      })
      .pipe(
        map(() => true),
        catchError(() => {
          throw new BadRequestException("Invalid refresh token");
        }),
      );
  }
}
