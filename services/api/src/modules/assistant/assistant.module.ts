import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { FinancialCalendarModule } from '../financial-calendar/financial-calendar.module';
import { MilestonesModule } from '../milestones/milestones.module';
import { RagModule } from '../rag/rag.module';
import { RecommendationsModule } from '../recommendations/recommendations.module';
import { RewardWalletModule } from '../reward-wallet/reward-wallet.module';
import { UserCardsModule } from '../user-cards/user-cards.module';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';

@Module({
  imports: [
    AiModule,
    RagModule,
    RecommendationsModule,
    UserCardsModule,
    RewardWalletModule,
    MilestonesModule,
    FinancialCalendarModule,
  ],
  controllers: [AssistantController],
  providers: [AssistantService],
  exports: [AssistantService],
})
export class AssistantModule {}
