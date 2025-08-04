import { Module } from "@nestjs/common";
import { WalletController } from "./wallet.controller";
import { GoogleWalletModule } from "common/gcp/wallet/google-wallet.module";
import { ObjectionModule } from "common/objection";
import { Hackathon } from "entities/hackathon.entity";
import { User } from "entities/user.entity";
import { AppleWalletController } from "./apple-wallet.controller";
import { AppleWalletService } from "common/apple/apple-wallet.service";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [
    ObjectionModule.forFeature([Hackathon, User]),
    GoogleWalletModule,
    ConfigModule,
  ],
  providers: [AppleWalletService],
  controllers: [WalletController, AppleWalletController],
})
export class WalletModule {}
