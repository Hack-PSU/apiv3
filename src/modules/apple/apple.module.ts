import { Module } from "@nestjs/common";
import { AppleController } from "modules/apple/apple.controller";
import { AppleAuthModule } from "common/apple/apple-auth.module";

@Module({
  imports: [AppleAuthModule],
  controllers: [AppleController],
})
export class AppleModule {}
