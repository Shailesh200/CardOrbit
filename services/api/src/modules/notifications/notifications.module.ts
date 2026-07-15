import { forwardRef, Global, Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';
import { MilestonesModule } from '../milestones/milestones.module';
import { OffersModule } from '../offers/offers.module';
import { TravelHubModule } from '../travel-hub/travel-hub.module';
import { ContextualNotificationsService } from './contextual-notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

/** Global so AuthService can inject NotificationsService without importing this module (avoids cycle). */
@Global()
@Module({
  imports: [
    forwardRef(() => AuthModule),
    FeatureFlagsModule,
    MilestonesModule,
    BillingModule,
    OffersModule,
    TravelHubModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, ContextualNotificationsService],
  exports: [NotificationsService, ContextualNotificationsService],
})
export class NotificationsModule {}
