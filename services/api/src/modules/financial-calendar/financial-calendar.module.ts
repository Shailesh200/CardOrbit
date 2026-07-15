import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';
import { MilestonesModule } from '../milestones/milestones.module';
import { OffersModule } from '../offers/offers.module';
import { RewardWalletModule } from '../reward-wallet/reward-wallet.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { UserCardsModule } from '../user-cards/user-cards.module';
import { FinancialCalendarController } from './financial-calendar.controller';
import { FinancialCalendarService } from './financial-calendar.service';

@Module({
  imports: [
    AuthModule,
    FeatureFlagsModule,
    BillingModule,
    MilestonesModule,
    RewardWalletModule,
    OffersModule,
    UserCardsModule,
    TransactionsModule,
  ],
  controllers: [FinancialCalendarController],
  providers: [FinancialCalendarService],
  exports: [FinancialCalendarService],
})
export class FinancialCalendarModule {}
