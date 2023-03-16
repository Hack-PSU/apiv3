import { Module } from "@nestjs/common";
import { FeatureFlagService } from "common/flags/feature-flag.service";

@Module({
  providers: [FeatureFlagService],
  exports: [FeatureFlagService],
})
export class FeatureFlagModule {}
