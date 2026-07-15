import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { CashbackModule } from '../cashback/cashback.module';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';
import { MilestonesModule } from '../milestones/milestones.module';
import { PremiumDashboardModule } from '../premium-dashboard/premium-dashboard.module';
import { RewardWalletModule } from '../reward-wallet/reward-wallet.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    AuthModule,
    FeatureFlagsModule,
    CashbackModule,
    RewardWalletModule,
    MilestonesModule,
    PremiumDashboardModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
