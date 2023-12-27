import { registerAs } from "@nestjs/config";
import { ResumeBucketConfig } from "common/gcp";
import { ConfigToken } from "common/config/config.constants";

export const resumeBucketConfig = registerAs<ResumeBucketConfig>(
  ConfigToken.RESUME,
  () => {
    return {
      resume_bucket: process.env.RESUME_BUCKET,
    };
  },
);
