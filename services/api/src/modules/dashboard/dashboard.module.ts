import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';
import { MerchantsModule } from '../merchants/merchants.module';
import { MilestonesModule } from '../milestones/milestones.module';
import { OffersModule } from '../offers/offers.module';
import { RewardWalletModule } from '../reward-wallet/reward-wallet.module';
import { TravelHubModule } from '../travel-hub/travel-hub.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { UserCardsModule } from '../user-cards/user-cards.module';
import { DashboardController } from './dashboard.controller';
import { DashboardInsightsService } from './dashboard-insights.service';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    UserCardsModule,
    MerchantsModule,
    OffersModule,
    AiModule,
    FeatureFlagsModule,
    RewardWalletModule,
    MilestonesModule,
    TravelHubModule,
    TransactionsModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService, DashboardInsightsService],
  exports: [DashboardService],
})
export class DashboardModule {}
