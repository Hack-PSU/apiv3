import { Module } from "@nestjs/common";
import { WalletController } from "./wallet.controller";
import { GoogleWalletModule } from "common/gcp/wallet/google-wallet.module";
import { AppleWalletModule } from "modules/apple-wallet/apple-wallet.module";
import { ObjectionModule } from "common/objection";
import { Hackathon } from "entities/hackathon.entity";

@Module({
  imports: [ObjectionModule.forFeature([Hackathon]), GoogleWalletModule, AppleWalletModule],
  controllers: [WalletController],
})
export class WalletModule {}