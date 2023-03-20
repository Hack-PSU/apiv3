import { registerAs } from "@nestjs/config";
import { AppleAuthConfig } from "common/apple/apple-auth.types";
import { ConfigToken } from "common/config/config.constants";
import * as fs from "fs";

export const appleConfig = registerAs<AppleAuthConfig>(
  ConfigToken.APPLE,
  () => {
    let pk = process.env.APPLE_AUTH_PK;
    if (process.env.GOOGLE_CERT) {
      pk = fs.readFileSync(process.env.APPLE_AUTH_PK).toString();
    }

    return {
      kid: process.env.APPLE_AUTH_KID,
      iss: process.env.APPLE_AUTH_ISS,
      aud: process.env.APPLE_AUTH_AUD,
      sub: process.env.APPLE_AUTH_SUB,
      pk: pk,
    };
  },
);
