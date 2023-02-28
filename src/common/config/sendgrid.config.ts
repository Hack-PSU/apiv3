import { registerAs } from "@nestjs/config";
import { SendGridOptions } from "common/email/email.types";
import { ConfigToken } from "common/config/config.constants";

export const sendGridConfig = registerAs<SendGridOptions>(
  ConfigToken.SENDGRID,
  () => ({
    apiKey: process.env.SENDGRID_API_KEY,
  }),
);
