import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { RewardExpiryModule } from '../reward-expiry/reward-expiry.module';
import { RewardWalletController } from './reward-wallet.controller';
import { RewardWalletService } from './reward-wallet.service';

@Module({
  imports: [AuthModule, RewardExpiryModule],
  controllers: [RewardWalletController],
  providers: [RewardWalletService],
  exports: [RewardWalletService],
})
export class RewardWalletModule {}
