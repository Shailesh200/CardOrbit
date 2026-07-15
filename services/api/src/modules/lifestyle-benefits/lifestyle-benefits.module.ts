import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { RewardsModule } from '../rewards/rewards.module';
import { RewardWalletModule } from '../reward-wallet/reward-wallet.module';
import { LifestyleBenefitsController } from './lifestyle-benefits.controller';
import { LifestyleBenefitsService } from './lifestyle-benefits.service';

@Module({
  imports: [AuthModule, RewardsModule, RewardWalletModule],
  controllers: [LifestyleBenefitsController],
  providers: [LifestyleBenefitsService],
  exports: [LifestyleBenefitsService],
})
export class LifestyleBenefitsModule {}
