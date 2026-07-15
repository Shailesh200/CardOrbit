import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { RewardsModule } from '../rewards/rewards.module';
import { SpendingInsightsController } from './spending-insights.controller';
import { SpendingInsightsService } from './spending-insights.service';

@Module({
  imports: [AuthModule, RewardsModule],
  controllers: [SpendingInsightsController],
  providers: [SpendingInsightsService],
  exports: [SpendingInsightsService],
})
export class SpendingInsightsModule {}
