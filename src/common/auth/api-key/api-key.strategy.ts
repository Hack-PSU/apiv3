import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-custom";
import { ApiKeyService } from "modules/api-key/api-key.service";
import { Request } from "express";
import { Role } from "common/gcp/auth/firebase-auth.types";

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, "api-key") {
  constructor(private readonly apiKeyService: ApiKeyService) {
    super();
  }

  /**
   * PassportStrategy supplies the verify callback itself and invokes this
   * method from it, so the callback must not be passed to super(). Returning
   * false fails authentication; throwing surfaces the error to Passport.
   */
  async validate(req: Request) {
    const apiKey = req.headers["x-api-key"];

    if (!apiKey || typeof apiKey !== "string") {
      return false;
    }

    const keyEntity = await this.apiKeyService.validateKey(apiKey);

    if (!keyEntity) {
      throw new UnauthorizedException();
    }

    return {
      ...keyEntity,
      production: Role.TECH,
      staging: Role.TECH,
    };
  }
}
