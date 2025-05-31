import { registerAs } from "@nestjs/config";

import { ConfigToken } from "common/config/config.constants";

export type NamecheapOptions = {
  apiKey: string;
  apiUser: string;
  clientIp: string;
  baseUrl: string;
};

export const namecheapConfig = registerAs<NamecheapOptions>(
  ConfigToken.NAMECHEAP,
  () => ({
    apiKey: process.env.NAMECHEAP_API_KEY,
    apiUser: process.env.NAMECHEAP_API_USER,
    clientIp: process.env.NAMECHEAP_CLIENT_IP,
    baseUrl: process.env.NAMECHEAP_BASE_URL,
  }),
);
