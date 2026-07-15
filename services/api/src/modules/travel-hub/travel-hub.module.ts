import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { RewardsModule } from '../rewards/rewards.module';
import { RewardWalletModule } from '../reward-wallet/reward-wallet.module';
import { TravelHubController } from './travel-hub.controller';
import { TravelHubService } from './travel-hub.service';

@Module({
  imports: [AuthModule, RewardsModule, RewardWalletModule],
  controllers: [TravelHubController],
  providers: [TravelHubService],
  exports: [TravelHubService],
})
export class TravelHubModule {}
