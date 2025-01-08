import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { FirebaseAuthService } from "./firebase-auth.service";
import { jwtDecode, JwtHeader } from "jwt-decode";
import { map } from "rxjs";
import { ConfigService } from "@nestjs/config";

type FirebaseJwtHeader = JwtHeader & { kid: string };

@Injectable()
export class FirebaseAuthStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly authService: FirebaseAuthService,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      audience: configService.get("JWT_AUTH_AUDIENCE"),
      ignoreExpiration: false,
      secretOrKeyProvider: (request, rawJwtToken, done) => {
        const jwtHeader = jwtDecode(rawJwtToken, {
          header: true,
        }) as FirebaseJwtHeader;

        this.authService
          .getJWTKeys()
          .pipe(map((kid) => kid.data[jwtHeader.kid]))
          .subscribe({
            next: (kid) => done(null, kid),
            error: (err) => {
              console.error(err);
              done(err, "");
            },
          });
      },
    });
  }

  validate(payload: unknown): unknown {
    return payload;
  }
}
