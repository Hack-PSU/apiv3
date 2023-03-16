import { Module } from "@nestjs/common";
import { FlagController } from "modules/flag/flag.controller";
import { FeatureFlagModule } from "common/flags/feature-flag.module";

@Module({
  imports: [FeatureFlagModule],
  controllers: [FlagController],
})
export class FlagModule {}
