import { Module, Global } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { GoogleWalletService } from "./google-wallet.service";

@Global()
@Module({
  imports: [ConfigModule],
  providers: [GoogleWalletService],
  exports: [GoogleWalletService],
})
export class GoogleWalletModule {}
