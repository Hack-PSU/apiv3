import { registerAs } from "@nestjs/config";

export default registerAs("gotify", () => ({
  url: process.env.GOTIFY_URL,
  token: process.env.GOTIFY_TOKEN,
  enabled: process.env.RUNTIME_INSTANCE === "production",
}));
