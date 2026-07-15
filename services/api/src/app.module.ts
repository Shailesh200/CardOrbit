import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

import { MailModule } from './infrastructure/mail/mail.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { AdminAuthModule } from './modules/admin-auth/admin-auth.module';
import { AuthModule } from './modules/auth/auth.module';
import { CardsModule } from './modules/cards/cards.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DebugModule } from './modules/debug/debug.module';
import { FeatureFlagsModule } from './modules/feature-flags/feature-flags.module';
import { HealthModule } from './modules/health/health.module';
import { MerchantsModule } from './modules/merchants/merchants.module';
import { OffersModule } from './modules/offers/offers.module';
import { AssetsModule } from './modules/assets/assets.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { PrivacyModule } from './modules/privacy/privacy.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { CardBenefitsModule } from './modules/card-benefits/card-benefits.module';
import { CardComparisonModule } from './modules/card-comparison/card-comparison.module';
import { SpendingInsightsModule } from './modules/spending-insights/spending-insights.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { BillingModule } from './modules/billing/billing.module';
import { MilestonesModule } from './modules/milestones/milestones.module';
import { CashbackModule } from './modules/cashback/cashback.module';
import { RedemptionsModule } from './modules/redemptions/redemptions.module';
import { TravelHubModule } from './modules/travel-hub/travel-hub.module';
import { TripPlannerModule } from './modules/trip-planner/trip-planner.module';
import { LifestyleBenefitsModule } from './modules/lifestyle-benefits/lifestyle-benefits.module';
import { PremiumDashboardModule } from './modules/premium-dashboard/premium-dashboard.module';
import { RewardWalletModule } from './modules/reward-wallet/reward-wallet.module';
import { RewardExpiryModule } from './modules/reward-expiry/reward-expiry.module';
import { RewardsModule } from './modules/rewards/rewards.module';
import { CatalogImportModule } from './modules/catalog-import/catalog-import.module';
import { AiModule } from './modules/ai/ai.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { SearchModule } from './modules/search/search.module';
import { KnowledgeGraphModule } from './modules/knowledge-graph/knowledge-graph.module';
import { RagModule } from './modules/rag/rag.module';
import { AssistantModule } from './modules/assistant/assistant.module';
import { AdminSduiModule } from './modules/admin-sdui/admin-sdui.module';
import { AdminInsightsModule } from './modules/admin-insights/admin-insights.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { FinancialCalendarModule } from './modules/financial-calendar/financial-calendar.module';
import { ReportsModule } from './modules/reports/reports.module';
import { BookingModule } from './modules/booking/booking.module';
import { UsersModule } from './modules/users/users.module';
import { UserCardsModule } from './modules/user-cards/user-cards.module';
import { MailSyncModule } from './modules/mail-sync/mail-sync.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
      },
    }),
    PrismaModule,
    FeatureFlagsModule,
    MailModule,
    HealthModule,
    // Before AuthModule: global NotificationsService is injected by AuthService (welcome email).
    NotificationsModule,
    AuthModule,
    MailSyncModule,
    UsersModule,
    DashboardModule,
    OnboardingModule,
    UserCardsModule,
    CardBenefitsModule,
    CardComparisonModule,
    SpendingInsightsModule,
    TransactionsModule,
    BillingModule,
    MilestonesModule,
    CashbackModule,
    RedemptionsModule,
    TravelHubModule,
    TripPlannerModule,
    LifestyleBenefitsModule,
    PremiumDashboardModule,
    PrivacyModule,
    DebugModule,
    AdminAuthModule,
    CardsModule,
    MerchantsModule,
    RewardsModule,
    OffersModule,
    AssetsModule,
    RecommendationsModule,
    RewardWalletModule,
    RewardExpiryModule,
    FinancialCalendarModule,
    ReportsModule,
    BookingModule,
    CatalogImportModule,
    AiModule,
    JobsModule,
    SearchModule,
    KnowledgeGraphModule,
    RagModule,
    AssistantModule,
    AdminSduiModule,
    AdminInsightsModule,
  ],
})
export class AppModule {}
