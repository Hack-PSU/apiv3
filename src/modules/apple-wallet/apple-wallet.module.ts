import { Module } from '@nestjs/common';
import { AppleWalletService } from './apple-wallet.service';

@Module({
  providers: [AppleWalletService],
  exports: [AppleWalletService],
})
export class AppleWalletModule {}