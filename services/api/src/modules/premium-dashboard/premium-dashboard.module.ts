import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { MilestonesModule } from '../milestones/milestones.module';
import { RewardWalletModule } from '../reward-wallet/reward-wallet.module';
import { PremiumDashboardController } from './premium-dashboard.controller';
import { PremiumDashboardService } from './premium-dashboard.service';

@Module({
  imports: [AuthModule, RewardWalletModule, MilestonesModule],
  controllers: [PremiumDashboardController],
  providers: [PremiumDashboardService],
  exports: [PremiumDashboardService],
})
export class PremiumDashboardModule {}
