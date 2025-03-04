// modules/apple-wallet/apple-wallet.module.ts
import { Module, Global } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppleWalletService } from "./apple-wallet.service";

@Global()
@Module({
  imports: [ConfigModule],
  providers: [AppleWalletService],
  exports: [AppleWalletService],
})
export class AppleWalletModule {}
