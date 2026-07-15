import { Module } from '@nestjs/common';

import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { AuthModule } from '../auth/auth.module';
import { MerchantsModule } from '../merchants/merchants.module';
import { RewardsModule } from '../rewards/rewards.module';
import { AiModule } from '../ai/ai.module';
import { MilestonesModule } from '../milestones/milestones.module';
import { RewardWalletModule } from '../reward-wallet/reward-wallet.module';
import { AdminRecommendationsController } from './controllers/admin-recommendations.controller';
import { RecommendationsController } from './controllers/recommendations.controller';
import { RecommendationsShowcaseController } from './controllers/recommendations-showcase.controller';
import { RecommendationsService } from './recommendations.service';
import { RecommendationHistoryService } from './recommendation-history.service';
import { RankingSignalsService } from './ranking-signals.service';
import { StrategicSignalsService } from './domain/services/strategic-signals.service';

@Module({
  imports: [
    AuthModule,
    AdminAuthModule,
    MerchantsModule,
    RewardsModule,
    AiModule,
    MilestonesModule,
    RewardWalletModule,
  ],
  controllers: [
    RecommendationsController,
    RecommendationsShowcaseController,
    AdminRecommendationsController,
  ],
  providers: [
    RecommendationsService,
    RecommendationHistoryService,
    RankingSignalsService,
    StrategicSignalsService,
  ],
  exports: [RecommendationsService, RecommendationHistoryService],
})
export class RecommendationsModule {}
