/**
 * Typed product analytics event catalog.
 * Feature code must emit only these events via trackEvent() — never call PostHog directly.
 */

export const AnalyticsEvent = {
  USER_REGISTERED: 'USER_REGISTERED',
  /** Successful email or Google login (including returning Google users). */
  USER_LOGGED_IN: 'USER_LOGGED_IN',
  USER_LOGGED_OUT: 'USER_LOGGED_OUT',
  EMAIL_VERIFIED: 'EMAIL_VERIFIED',
  AUTH_LOGIN_FAILED: 'AUTH_LOGIN_FAILED',
  AUTH_PAGE_VIEWED: 'AUTH_PAGE_VIEWED',
  /** SPA route change / page visit (consent-gated client). */
  PAGE_VIEWED: 'PAGE_VIEWED',
  MARKETING_CTA_CLICKED: 'MARKETING_CTA_CLICKED',
  SESSION_STARTED: 'SESSION_STARTED',
  GMAIL_CONNECTED: 'GMAIL_CONNECTED',
  GMAIL_SYNC_STARTED: 'GMAIL_SYNC_STARTED',
  GMAIL_SYNC_COMPLETED: 'GMAIL_SYNC_COMPLETED',
  CARD_ADDED: 'CARD_ADDED',
  CARD_REMOVED: 'CARD_REMOVED',
  MERCHANT_SEARCHED: 'MERCHANT_SEARCHED',
  CARD_COMPARED: 'CARD_COMPARED',
  SPENDING_INSIGHTS_VIEWED: 'SPENDING_INSIGHTS_VIEWED',
  TRANSACTIONS_VIEWED: 'TRANSACTIONS_VIEWED',
  TRANSACTIONS_IMPORTED: 'TRANSACTIONS_IMPORTED',
  MILESTONES_VIEWED: 'MILESTONES_VIEWED',
  ANNUAL_FEE_WAIVER_VIEWED: 'ANNUAL_FEE_WAIVER_VIEWED',
  CASHBACK_VIEWED: 'CASHBACK_VIEWED',
  CASHBACK_HISTORY_VIEWED: 'CASHBACK_HISTORY_VIEWED',
  REDEMPTIONS_VIEWED: 'REDEMPTIONS_VIEWED',
  REDEMPTION_VALIDATED: 'REDEMPTION_VALIDATED',
  REDEMPTION_RECORDED: 'REDEMPTION_RECORDED',
  TRAVEL_HUB_VIEWED: 'TRAVEL_HUB_VIEWED',
  TRIP_PLANNER_VIEWED: 'TRIP_PLANNER_VIEWED',
  TRIP_PLAN_CREATED: 'TRIP_PLAN_CREATED',
  LIFESTYLE_BENEFITS_VIEWED: 'LIFESTYLE_BENEFITS_VIEWED',
  PREMIUM_DASHBOARD_VIEWED: 'PREMIUM_DASHBOARD_VIEWED',
  STATEMENTS_VIEWED: 'STATEMENTS_VIEWED',
  STATEMENT_CREATED: 'STATEMENT_CREATED',
  BILL_PAYMENT_RECORDED: 'BILL_PAYMENT_RECORDED',
  BILLING_CALENDAR_VIEWED: 'BILLING_CALENDAR_VIEWED',
  RECOMMENDATION_REQUESTED: 'RECOMMENDATION_REQUESTED',
  RECOMMENDATION_VIEWED: 'RECOMMENDATION_VIEWED',
  RECOMMENDATION_CLICKED: 'RECOMMENDATION_CLICKED',
  RECOMMENDATION_FEEDBACK_SUBMITTED: 'RECOMMENDATION_FEEDBACK_SUBMITTED',
  OFFER_VIEWED: 'OFFER_VIEWED',
  OFFER_SAVED: 'OFFER_SAVED',
  ONBOARDING_STARTED: 'ONBOARDING_STARTED',
  ONBOARDING_STEP_COMPLETED: 'ONBOARDING_STEP_COMPLETED',
  ONBOARDING_COMPLETED: 'ONBOARDING_COMPLETED',
  ONBOARDING_SKIPPED: 'ONBOARDING_SKIPPED',
  /** Emitted when catalog/card data is incomplete for intelligence (M-023 triage). */
  CARD_DATA_GAP: 'CARD_DATA_GAP',
  /** Emitted when merchant catalog or mapping data is incomplete (M-025 triage). */
  MERCHANT_DATA_GAP: 'MERCHANT_DATA_GAP',
  /** Phase 2 — extension telemetry (M-034). */
  EXTENSION_OPENED: 'EXTENSION_OPENED',
  EXTENSION_MERCHANT_DETECTED: 'EXTENSION_MERCHANT_DETECTED',
  EXTENSION_OVERLAY_VIEWED: 'EXTENSION_OVERLAY_VIEWED',
  EXTENSION_OVERLAY_INTERACTION: 'EXTENSION_OVERLAY_INTERACTION',
  /** Phase 2 — merchant preferences (M-034). */
  MERCHANT_FAVORITED: 'MERCHANT_FAVORITED',
  MERCHANT_UNFAVORITED: 'MERCHANT_UNFAVORITED',
  SAVED_SEARCH_CREATED: 'SAVED_SEARCH_CREATED',
  SAVED_SEARCH_RUN: 'SAVED_SEARCH_RUN',
  /** Phase 2 — recommendation UX (M-034). */
  ALTERNATIVE_CARD_SELECTED: 'ALTERNATIVE_CARD_SELECTED',
  /** Phase 2 — dashboard personalization (M-034). */
  DASHBOARD_WIDGET_INTERACTION: 'DASHBOARD_WIDGET_INTERACTION',
  /** Phase 3 — personalized homepage (M-050). */
  PERSONALIZED_HOMEPAGE_VIEWED: 'PERSONALIZED_HOMEPAGE_VIEWED',
  /** Phase 3 — advanced notifications (M-051). */
  NOTIFICATIONS_VIEWED: 'NOTIFICATIONS_VIEWED',
  NOTIFICATION_DELIVERED: 'NOTIFICATION_DELIVERED',
  NOTIFICATION_CLICKED: 'NOTIFICATION_CLICKED',
  CONTEXTUAL_NOTIFICATIONS_SYNCED: 'CONTEXTUAL_NOTIFICATIONS_SYNCED',
  /** Phase 3 — financial calendar & timeline (M-052). */
  FINANCIAL_CALENDAR_VIEWED: 'FINANCIAL_CALENDAR_VIEWED',
  FINANCIAL_TIMELINE_VIEWED: 'FINANCIAL_TIMELINE_VIEWED',
  CALENDAR_REMINDER_CREATED: 'CALENDAR_REMINDER_CREATED',
  /** Phase 3 — user reports & analytics (M-053). */
  REPORTS_HUB_VIEWED: 'REPORTS_HUB_VIEWED',
  REPORT_VIEWED: 'REPORT_VIEWED',
  REPORT_EXPORTED: 'REPORT_EXPORTED',
  /** Phase 3/4 — booking engine foundation (M-054). */
  BOOKING_HUB_VIEWED: 'BOOKING_HUB_VIEWED',
  BOOKING_SEARCH_PERFORMED: 'BOOKING_SEARCH_PERFORMED',
  BOOKING_PRICING_VIEWED: 'BOOKING_PRICING_VIEWED',
  /** Phase 3/4 — bank portal booking channels (M-055+). */
  BOOKING_CHANNEL_RECOMMENDED: 'BOOKING_CHANNEL_RECOMMENDED',
  BOOKING_PORTAL_HANDOFF_CLICKED: 'BOOKING_PORTAL_HANDOFF_CLICKED',
  /** Phase 3/4 — flight booking depth (M-055). */
  BOOKING_OFFER_SELECTED: 'BOOKING_OFFER_SELECTED',
  BOOKING_FARE_VALIDATED: 'BOOKING_FARE_VALIDATED',
  BOOKING_PAYMENT_OPTIMIZED: 'BOOKING_PAYMENT_OPTIMIZED',
  /** Phase 3/4 — hotel booking / loyalty (M-056). */
  BOOKING_LOYALTY_OPTIMIZED: 'BOOKING_LOYALTY_OPTIMIZED',
  /** Phase 2 — experiment exposure for funnel analysis (M-034). */
  EXPERIMENT_EXPOSED: 'EXPERIMENT_EXPOSED',
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

export type UserRegisteredProperties = {
  method: 'email' | 'google' | 'unknown';
  source?: string;
};

export type UserLoggedInProperties = {
  method: 'email' | 'google';
  isReturning: boolean;
  surface?: 'web' | 'extension' | 'api';
};

export type UserLoggedOutProperties = {
  scope: 'current' | 'all';
  surface?: 'web' | 'extension' | 'api';
};

export type EmailVerifiedProperties = {
  method: 'email';
  hoursSinceSignup?: number;
};

export type AuthLoginFailedProperties = {
  method: 'email' | 'google';
  reason: 'invalid_credentials' | 'email_unverified' | 'inactive' | 'oauth_failed';
};

export type AuthPageViewedProperties = {
  page: 'signup' | 'login' | 'forgot_password' | 'verify_email' | 'reset_password';
  referrer?: string;
};

export type PageViewedProperties = {
  path: string;
  host: 'landing' | 'app' | 'other';
  isAuthenticated: boolean;
  /** Query param keys only (no values), truncated. */
  search?: string;
  referrer?: string;
};

export type MarketingCtaClickedProperties = {
  placement: 'hero' | 'nav' | 'below_fold' | 'ai_section';
  cta: string;
  destination: string;
};

export type SessionStartedProperties = {
  surface: 'web' | 'extension';
  isAuthenticated: boolean;
  path?: string;
};

export type GmailConnectedProperties = {
  isPrimary: boolean;
  mailboxCount: number;
  source: 'settings' | 'oauth_login_upsert';
};

export type GmailSyncStartedProperties = {
  mailboxId: string;
  portfolioCardCount: number;
  triggeredBy: 'user' | 'system';
};

export type GmailSyncCompletedProperties = {
  mailboxId: string;
  importedCount: number;
  messagesScanned: number;
  cardsAutoAdded?: number;
  status: 'success' | 'partial' | 'failed';
  durationMs?: number;
};

export type CardAddedProperties = {
  cardId: string;
  bankId?: string;
  source?: string;
};

export type CardRemovedProperties = {
  cardId: string;
};

export type MerchantSearchedProperties = {
  query: string;
  resultCount: number;
  /** True when the search returned zero merchants (M-023 triage signal). */
  searchFailed?: boolean;
  /** Server-side search latency in milliseconds (M-034). */
  searchLatencyMs?: number;
};

export type CardComparedProperties = {
  cardIds: string[];
};

export type SpendingInsightsViewedProperties = {
  dataSource: 'recommendation_history' | 'onboarding_profile' | 'blended' | 'transactions';
  inquiryCount: number;
  topCategorySlug?: string;
  categoryCount: number;
};

export type TransactionsViewedProperties = {
  visibleTransactions: number;
  source?: 'WEB' | 'EXTENSION' | 'DASHBOARD';
};

export type TransactionsImportedProperties = {
  imported: number;
  skipped: number;
  source: 'CSV';
};

export type StatementsViewedProperties = {
  count: number;
};

export type StatementCreatedProperties = {
  userCardId: string;
};

export type BillPaymentRecordedProperties = {
  statementId: string;
  amountInr: number;
};

export type BillingCalendarViewedProperties = {
  year: number;
  month: number;
};

export type MilestonesViewedProperties = {
  count: number;
  achievedCount: number;
};

export type AnnualFeeWaiverViewedProperties = {
  count: number;
  qualifiedCount: number;
};

export type CashbackViewedProperties = {
  totalEarnedInr: number;
  creditedCashbackInr: number;
  pendingCashbackInr: number;
};

export type CashbackHistoryViewedProperties = {
  count: number;
  page: number;
};

export type RedemptionsViewedProperties = {
  optionCount: number;
  eligibleCount: number;
};

export type RedemptionValidatedProperties = {
  eligible: boolean;
  optionType: string;
};

export type RedemptionRecordedProperties = {
  optionType: string;
  pointsRedeemed: number;
  estimatedValueInr: number;
};

export type TravelHubViewedProperties = {
  cardCount: number;
  loungeCardCount: number;
  totalMiles: number;
};

export type TripPlannerViewedProperties = Record<string, never>;

export type TripPlanCreatedProperties = {
  destination: string;
  tripDays: number;
  scope: 'DOMESTIC' | 'INTERNATIONAL';
  budgetInr: number;
  cardCount: number;
  totalEstimatedValueInr: number;
};

export type LifestyleBenefitsViewedProperties = {
  cardCount: number;
  insuranceCardCount: number;
  fuelCardCount: number;
  diningCardCount: number;
};

export type PremiumDashboardViewedProperties = {
  premiumCardCount: number;
  portfolioNetRoiInr: number;
  totalAnnualFeesInr: number;
};

export type RecommendationRequestedProperties = {
  merchantId?: string;
  merchantName?: string;
  category?: string;
  amount?: number;
  availableCardIds?: string[];
};

export type RecommendationViewedProperties = RecommendationRequestedProperties & {
  recommendedCardId: string;
  expectedReward?: number;
  rankingVersion?: 'v1' | 'v2' | 'v3';
  confidenceScore?: number;
};

export type RecommendationClickedProperties = RecommendationViewedProperties & {
  action: 'accepted' | 'dismissed' | 'ignored';
};

export type RecommendationFeedbackSubmittedProperties = {
  recommendationId: string;
  feedbackType:
    | 'USEFUL'
    | 'NOT_USEFUL'
    | 'WRONG_RECOMMENDATION'
    | 'MISSING_CARD'
    | 'INCORRECT_REWARD';
  merchantSlug?: string;
  source?: 'WEB' | 'EXTENSION' | 'DASHBOARD';
};

export type OfferViewedProperties = {
  offerId: string;
};

export type OfferSavedProperties = {
  offerId: string;
};

export type OnboardingStepName = 'WELCOME' | 'SPENDING' | 'CATEGORIES' | 'CARDS' | 'DONE' | 'ALL';

export type OnboardingStartedProperties = {
  source?: string;
};

export type OnboardingStepCompletedProperties = {
  step: OnboardingStepName;
  source?: string;
};

export type OnboardingCompletedProperties = {
  source?: string;
};

export type OnboardingSkippedProperties = {
  step?: OnboardingStepName;
  source?: string;
};

export type CardDataGapType = 'missing_reward_rule' | 'missing_benefit_data';

export type CardDataGapProperties = {
  gapType: CardDataGapType;
  cardId: string;
  cardSlug?: string;
  cardName?: string;
  merchantId?: string;
  merchantName?: string;
  spendCategoryId?: string | null;
  source?: string;
};

export type MerchantDataGapType =
  | 'failed_search'
  | 'missing_category'
  | 'missing_alias'
  | 'missing_mcc'
  | 'missing_website';

export type MerchantDataGapProperties = {
  gapType: MerchantDataGapType;
  query?: string;
  merchantId?: string;
  merchantSlug?: string;
  merchantName?: string;
  source?: string;
};

export type ExtensionOpenedProperties = {
  surface: 'popup' | 'overlay';
  merchantSlug?: string;
};

export type ExtensionMerchantDetectedProperties = {
  merchantSlug: string;
  merchantHostname?: string;
  tabUrl?: string;
};

export type ExtensionOverlayViewedProperties = {
  merchantSlug: string;
  merchantName?: string;
  amount?: number;
  amountDetected?: boolean;
  recommendedCardId?: string;
  recommendationId?: string;
};

export type ExtensionOverlayInteractionProperties = {
  merchantSlug: string;
  action:
    | 'collapse'
    | 'expand'
    | 'hide'
    | 'refresh'
    | 'feedback_helpful'
    | 'feedback_not_helpful'
    | 'open_merchant'
    | 'open_offers';
  recommendationId?: string;
};

export type MerchantFavoritedProperties = {
  merchantId: string;
  merchantSlug?: string;
  merchantName?: string;
  source?: 'web' | 'dashboard';
};

export type MerchantUnfavoritedProperties = MerchantFavoritedProperties;

export type SavedSearchCreatedProperties = {
  savedSearchId: string;
  name: string;
  query?: string;
  categorySlug?: string | null;
};

export type SavedSearchRunProperties = {
  savedSearchId: string;
  name: string;
  query?: string;
  categorySlug?: string | null;
  resultCount?: number;
};

export type AlternativeCardSelectedProperties = RecommendationViewedProperties & {
  previousRecommendedCardId?: string;
  rank?: number;
};

export type DashboardWidgetInteractionProperties = {
  widgetId: string;
  action: 'shown' | 'hidden' | 'clicked' | 'customized';
  source?: 'dashboard';
};

export type PersonalizedHomepageViewedProperties = {
  sectionCount: number;
  actionCount: number;
  expiringRewardCount: number;
  milestoneCount: number;
  hasTravelContext: boolean;
  recentActivityCount: number;
};

export type NotificationsViewedProperties = {
  total: number;
  unreadCount: number;
  contextualEnabled: boolean;
};

export type NotificationDeliveredProperties = {
  type: string;
  channel: 'in_app' | 'email';
  priority?: 'high' | 'medium' | 'low';
};

export type NotificationClickedProperties = {
  notificationId: string;
  type: string;
  linkUrl?: string;
};

export type ContextualNotificationsSyncedProperties = {
  delivered: number;
  candidates: number;
  skipped: number;
};

export type FinancialCalendarViewedProperties = {
  year: number;
  month: number;
  eventCount: number;
  view: 'month' | 'agenda';
};

export type FinancialTimelineViewedProperties = {
  page: number;
  pageSize: number;
  total: number;
  category?: string;
};

export type CalendarReminderCreatedProperties = {
  priority: 'high' | 'medium' | 'low';
  reminderOffsetDays: number;
};

export type ReportsHubViewedProperties = {
  period: string;
  sectionCount: number;
  kpiCount: number;
};

export type ReportViewedProperties = {
  reportType: string;
  period: string;
};

export type ReportExportedProperties = {
  reportType: string;
  format: 'csv';
};

export type BookingHubViewedProperties = {
  supportedProductCount: number;
  supplierCount: number;
};

export type BookingSearchPerformedProperties = {
  product: 'FLIGHT' | 'HOTEL';
  offerCount: number;
  supplierCount: number;
};

export type BookingPricingViewedProperties = {
  product: 'FLIGHT' | 'HOTEL';
  effectiveCostInr: number;
};

export type BookingChannelRecommendedProperties = {
  product: 'FLIGHT' | 'HOTEL';
  channelCount: number;
  topChannelSlug: string | null;
  portalCount: number;
};

export type BookingPortalHandoffClickedProperties = {
  channelId: string;
  slug: string;
  product: 'FLIGHT' | 'HOTEL';
};

export type BookingOfferSelectedProperties = {
  offerId: string;
  product: 'FLIGHT' | 'HOTEL';
  supplierCode: string;
};

export type BookingFareValidatedProperties = {
  offerId: string;
  outcome: string;
  priceDeltaInr: number;
};

export type BookingPaymentOptimizedProperties = {
  product: 'FLIGHT' | 'HOTEL';
  cardCount: number;
  recommendedUserCardId: string | null;
};

export type BookingLoyaltyOptimizedProperties = {
  pathCount: number;
  recommendedPath: string | null;
  offerId: string | null;
};

export type ExperimentExposedProperties = {
  experimentKey: string;
  variant: string;
  surface?: 'web' | 'extension' | 'api';
};

export type EventPropertiesMap = {
  USER_REGISTERED: UserRegisteredProperties;
  USER_LOGGED_IN: UserLoggedInProperties;
  USER_LOGGED_OUT: UserLoggedOutProperties;
  EMAIL_VERIFIED: EmailVerifiedProperties;
  AUTH_LOGIN_FAILED: AuthLoginFailedProperties;
  AUTH_PAGE_VIEWED: AuthPageViewedProperties;
  PAGE_VIEWED: PageViewedProperties;
  MARKETING_CTA_CLICKED: MarketingCtaClickedProperties;
  SESSION_STARTED: SessionStartedProperties;
  GMAIL_CONNECTED: GmailConnectedProperties;
  GMAIL_SYNC_STARTED: GmailSyncStartedProperties;
  GMAIL_SYNC_COMPLETED: GmailSyncCompletedProperties;
  CARD_ADDED: CardAddedProperties;
  CARD_REMOVED: CardRemovedProperties;
  MERCHANT_SEARCHED: MerchantSearchedProperties;
  CARD_COMPARED: CardComparedProperties;
  SPENDING_INSIGHTS_VIEWED: SpendingInsightsViewedProperties;
  TRANSACTIONS_VIEWED: TransactionsViewedProperties;
  TRANSACTIONS_IMPORTED: TransactionsImportedProperties;
  STATEMENTS_VIEWED: StatementsViewedProperties;
  STATEMENT_CREATED: StatementCreatedProperties;
  BILL_PAYMENT_RECORDED: BillPaymentRecordedProperties;
  BILLING_CALENDAR_VIEWED: BillingCalendarViewedProperties;
  MILESTONES_VIEWED: MilestonesViewedProperties;
  ANNUAL_FEE_WAIVER_VIEWED: AnnualFeeWaiverViewedProperties;
  CASHBACK_VIEWED: CashbackViewedProperties;
  CASHBACK_HISTORY_VIEWED: CashbackHistoryViewedProperties;
  REDEMPTIONS_VIEWED: RedemptionsViewedProperties;
  REDEMPTION_VALIDATED: RedemptionValidatedProperties;
  REDEMPTION_RECORDED: RedemptionRecordedProperties;
  TRAVEL_HUB_VIEWED: TravelHubViewedProperties;
  TRIP_PLANNER_VIEWED: TripPlannerViewedProperties;
  TRIP_PLAN_CREATED: TripPlanCreatedProperties;
  LIFESTYLE_BENEFITS_VIEWED: LifestyleBenefitsViewedProperties;
  PREMIUM_DASHBOARD_VIEWED: PremiumDashboardViewedProperties;
  RECOMMENDATION_REQUESTED: RecommendationRequestedProperties;
  RECOMMENDATION_VIEWED: RecommendationViewedProperties;
  RECOMMENDATION_CLICKED: RecommendationClickedProperties;
  RECOMMENDATION_FEEDBACK_SUBMITTED: RecommendationFeedbackSubmittedProperties;
  OFFER_VIEWED: OfferViewedProperties;
  OFFER_SAVED: OfferSavedProperties;
  ONBOARDING_STARTED: OnboardingStartedProperties;
  ONBOARDING_STEP_COMPLETED: OnboardingStepCompletedProperties;
  ONBOARDING_COMPLETED: OnboardingCompletedProperties;
  ONBOARDING_SKIPPED: OnboardingSkippedProperties;
  CARD_DATA_GAP: CardDataGapProperties;
  MERCHANT_DATA_GAP: MerchantDataGapProperties;
  EXTENSION_OPENED: ExtensionOpenedProperties;
  EXTENSION_MERCHANT_DETECTED: ExtensionMerchantDetectedProperties;
  EXTENSION_OVERLAY_VIEWED: ExtensionOverlayViewedProperties;
  EXTENSION_OVERLAY_INTERACTION: ExtensionOverlayInteractionProperties;
  MERCHANT_FAVORITED: MerchantFavoritedProperties;
  MERCHANT_UNFAVORITED: MerchantUnfavoritedProperties;
  SAVED_SEARCH_CREATED: SavedSearchCreatedProperties;
  SAVED_SEARCH_RUN: SavedSearchRunProperties;
  ALTERNATIVE_CARD_SELECTED: AlternativeCardSelectedProperties;
  DASHBOARD_WIDGET_INTERACTION: DashboardWidgetInteractionProperties;
  PERSONALIZED_HOMEPAGE_VIEWED: PersonalizedHomepageViewedProperties;
  NOTIFICATIONS_VIEWED: NotificationsViewedProperties;
  NOTIFICATION_DELIVERED: NotificationDeliveredProperties;
  NOTIFICATION_CLICKED: NotificationClickedProperties;
  CONTEXTUAL_NOTIFICATIONS_SYNCED: ContextualNotificationsSyncedProperties;
  FINANCIAL_CALENDAR_VIEWED: FinancialCalendarViewedProperties;
  FINANCIAL_TIMELINE_VIEWED: FinancialTimelineViewedProperties;
  CALENDAR_REMINDER_CREATED: CalendarReminderCreatedProperties;
  REPORTS_HUB_VIEWED: ReportsHubViewedProperties;
  REPORT_VIEWED: ReportViewedProperties;
  REPORT_EXPORTED: ReportExportedProperties;
  BOOKING_HUB_VIEWED: BookingHubViewedProperties;
  BOOKING_SEARCH_PERFORMED: BookingSearchPerformedProperties;
  BOOKING_PRICING_VIEWED: BookingPricingViewedProperties;
  BOOKING_CHANNEL_RECOMMENDED: BookingChannelRecommendedProperties;
  BOOKING_PORTAL_HANDOFF_CLICKED: BookingPortalHandoffClickedProperties;
  BOOKING_OFFER_SELECTED: BookingOfferSelectedProperties;
  BOOKING_FARE_VALIDATED: BookingFareValidatedProperties;
  BOOKING_PAYMENT_OPTIMIZED: BookingPaymentOptimizedProperties;
  BOOKING_LOYALTY_OPTIMIZED: BookingLoyaltyOptimizedProperties;
  EXPERIMENT_EXPOSED: ExperimentExposedProperties;
};

export type TrackedEvent<E extends AnalyticsEventName = AnalyticsEventName> = {
  event: E;
  properties: EventPropertiesMap[E];
  distinctId?: string;
  timestamp: string;
};
