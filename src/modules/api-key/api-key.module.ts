import { Module } from "@nestjs/common";
import { ObjectionModule } from "common/objection";
import { ApiKey } from "entities/api-key.entity";
import { ApiKeyService } from "./api-key.service";
import { ApiKeyController } from "./api-key.controller";
import { ApiKeyStrategy } from "common/auth/api-key/api-key.strategy";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [ObjectionModule.forFeature([ApiKey]), ConfigModule],
  providers: [ApiKeyService, ApiKeyStrategy],
  controllers: [ApiKeyController],
  exports: [ApiKeyService],
})
export class ApiKeyModule {}
