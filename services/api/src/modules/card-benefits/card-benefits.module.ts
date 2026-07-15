import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { RewardsModule } from '../rewards/rewards.module';
import { CardBenefitsController } from './card-benefits.controller';
import { CardBenefitsService } from './card-benefits.service';

@Module({
  imports: [AuthModule, RewardsModule],
  controllers: [CardBenefitsController],
  providers: [CardBenefitsService],
  exports: [CardBenefitsService],
})
export class CardBenefitsModule {}
