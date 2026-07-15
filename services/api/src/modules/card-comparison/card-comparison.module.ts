import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { RewardsModule } from '../rewards/rewards.module';
import { CardComparisonController } from './card-comparison.controller';
import { CardComparisonService } from './card-comparison.service';

@Module({
  imports: [AuthModule, RewardsModule],
  controllers: [CardComparisonController],
  providers: [CardComparisonService],
  exports: [CardComparisonService],
})
export class CardComparisonModule {}
