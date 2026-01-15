import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-custom";
import { ApiKeyService } from "modules/api-key/api-key.service";
import { Request } from "express";
import { Role } from "common/gcp/auth/firebase-auth.types";

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, "api-key") {
  constructor(private readonly apiKeyService: ApiKeyService) {
    super(
      async (req: Request, done: (err: Error | null, user?: any) => void) => {
        const apiKey = req.headers["x-api-key"];

        if (!apiKey || typeof apiKey !== "string") {
          return done(null, false);
        }

        try {
          const keyEntity = await this.apiKeyService.validateKey(apiKey);
          if (!keyEntity) {
            return done(new UnauthorizedException(), null);
          }
          return done(null, {
            ...keyEntity,
            production: Role.TECH,
            staging: Role.TECH,
          });
        } catch (err) {
          return done(err as Error, null);
        }
      },
    );
  }
}
