import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ConfigModule } from "@nestjs/config";
import { namecheapConfig } from "common/config/namecheap";
import { NamecheapEmailForwardingService } from "common/namecheap/namecheap.service";
import { EmailController } from "modules/email/email.controller";

@Module({
  imports: [HttpModule, ConfigModule.forFeature(namecheapConfig)],
  controllers: [EmailController],
  providers: [NamecheapEmailForwardingService],
  exports: [NamecheapEmailForwardingService],
})
export class EmailModule {}
