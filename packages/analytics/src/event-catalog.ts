import { AnalyticsEvent, type AnalyticsEventName } from './events';

export type AnalyticsEventCatalogEntry = {
  event: AnalyticsEventName;
  category:
    | 'user'
    | 'recommendation'
    | 'merchant'
    | 'card'
    | 'extension'
    | 'dashboard'
    | 'experiment'
    | 'travel';
  description: string;
  phase: '0' | '1' | '2' | '3';
  keyProperties: string[];
};

/** Human-readable catalog for admin analytics views (M-034). */
export const ANALYTICS_EVENT_CATALOG: AnalyticsEventCatalogEntry[] = [
  {
    event: AnalyticsEvent.USER_REGISTERED,
    category: 'user',
    description: 'New account created.',
    phase: '0',
    keyProperties: ['method', 'source'],
  },
  {
    event: AnalyticsEvent.CARD_ADDED,
    category: 'card',
    description: 'User adds a card to their portfolio.',
    phase: '0',
    keyProperties: ['cardId', 'bankId'],
  },
  {
    event: AnalyticsEvent.MERCHANT_SEARCHED,
    category: 'merchant',
    description: 'Merchant search executed.',
    phase: '1',
    keyProperties: ['query', 'resultCount', 'searchLatencyMs'],
  },
  {
    event: AnalyticsEvent.RECOMMENDATION_REQUESTED,
    category: 'recommendation',
    description: 'Best-card recommendation requested.',
    phase: '0',
    keyProperties: ['merchantName', 'amount'],
  },
  {
    event: AnalyticsEvent.RECOMMENDATION_VIEWED,
    category: 'recommendation',
    description: 'Recommendation displayed to the user.',
    phase: '1',
    keyProperties: ['recommendedCardId', 'expectedReward'],
  },
  {
    event: AnalyticsEvent.RECOMMENDATION_FEEDBACK_SUBMITTED,
    category: 'recommendation',
    description: 'User submits thumbs or structured feedback.',
    phase: '2',
    keyProperties: ['recommendationId', 'feedbackType', 'source'],
  },
  {
    event: AnalyticsEvent.ALTERNATIVE_CARD_SELECTED,
    category: 'recommendation',
    description: 'User selects an alternative card from the ranked list.',
    phase: '2',
    keyProperties: ['recommendedCardId', 'previousRecommendedCardId', 'rank'],
  },
  {
    event: AnalyticsEvent.MERCHANT_FAVORITED,
    category: 'merchant',
    description: 'Merchant added to favorites.',
    phase: '2',
    keyProperties: ['merchantId', 'merchantSlug'],
  },
  {
    event: AnalyticsEvent.SAVED_SEARCH_CREATED,
    category: 'merchant',
    description: 'User saves a merchant search.',
    phase: '2',
    keyProperties: ['savedSearchId', 'name', 'query'],
  },
  {
    event: AnalyticsEvent.SAVED_SEARCH_RUN,
    category: 'merchant',
    description: 'User re-runs a saved search.',
    phase: '2',
    keyProperties: ['savedSearchId', 'resultCount'],
  },
  {
    event: AnalyticsEvent.EXTENSION_OPENED,
    category: 'extension',
    description: 'Extension popup or overlay opened.',
    phase: '2',
    keyProperties: ['surface', 'merchantSlug'],
  },
  {
    event: AnalyticsEvent.EXTENSION_MERCHANT_DETECTED,
    category: 'extension',
    description: 'Supported merchant detected on an active tab.',
    phase: '2',
    keyProperties: ['merchantSlug', 'merchantHostname'],
  },
  {
    event: AnalyticsEvent.EXTENSION_OVERLAY_VIEWED,
    category: 'extension',
    description: 'In-page overlay rendered with a recommendation.',
    phase: '2',
    keyProperties: ['merchantSlug', 'recommendedCardId', 'amountDetected'],
  },
  {
    event: AnalyticsEvent.EXTENSION_OVERLAY_INTERACTION,
    category: 'extension',
    description: 'User interacts with the overlay (collapse, feedback, etc.).',
    phase: '2',
    keyProperties: ['action', 'merchantSlug'],
  },
  {
    event: AnalyticsEvent.DASHBOARD_WIDGET_INTERACTION,
    category: 'dashboard',
    description: 'Dashboard widget shown, hidden, or clicked.',
    phase: '2',
    keyProperties: ['widgetId', 'action'],
  },
  {
    event: AnalyticsEvent.PERSONALIZED_HOMEPAGE_VIEWED,
    category: 'dashboard',
    description: 'Personalized homepage snapshot rendered for an authenticated user.',
    phase: '3',
    keyProperties: ['sectionCount', 'actionCount', 'expiringRewardCount'],
  },
  {
    event: AnalyticsEvent.NOTIFICATIONS_VIEWED,
    category: 'dashboard',
    description: 'User opened the in-app notifications center.',
    phase: '3',
    keyProperties: ['total', 'unreadCount', 'contextualEnabled'],
  },
  {
    event: AnalyticsEvent.NOTIFICATION_DELIVERED,
    category: 'dashboard',
    description: 'A contextual or product notification was delivered.',
    phase: '3',
    keyProperties: ['type', 'channel'],
  },
  {
    event: AnalyticsEvent.NOTIFICATION_CLICKED,
    category: 'dashboard',
    description: 'User opened a notification deep link.',
    phase: '3',
    keyProperties: ['notificationId', 'type'],
  },
  {
    event: AnalyticsEvent.CONTEXTUAL_NOTIFICATIONS_SYNCED,
    category: 'dashboard',
    description: 'Contextual notification sync completed for a user.',
    phase: '3',
    keyProperties: ['delivered', 'candidates', 'skipped'],
  },
  {
    event: AnalyticsEvent.FINANCIAL_CALENDAR_VIEWED,
    category: 'dashboard',
    description: 'User viewed the unified financial calendar month or agenda.',
    phase: '3',
    keyProperties: ['year', 'month', 'eventCount', 'view'],
  },
  {
    event: AnalyticsEvent.FINANCIAL_TIMELINE_VIEWED,
    category: 'dashboard',
    description: 'User viewed the financial activity timeline.',
    phase: '3',
    keyProperties: ['page', 'total'],
  },
  {
    event: AnalyticsEvent.CALENDAR_REMINDER_CREATED,
    category: 'dashboard',
    description: 'User created a custom calendar reminder.',
    phase: '3',
    keyProperties: ['priority', 'reminderOffsetDays'],
  },
  {
    event: AnalyticsEvent.REPORTS_HUB_VIEWED,
    category: 'dashboard',
    description: 'User opened the reports & analytics hub.',
    phase: '3',
    keyProperties: ['period', 'sectionCount'],
  },
  {
    event: AnalyticsEvent.REPORT_VIEWED,
    category: 'dashboard',
    description: 'User viewed a typed financial report section.',
    phase: '3',
    keyProperties: ['reportType', 'period'],
  },
  {
    event: AnalyticsEvent.REPORT_EXPORTED,
    category: 'dashboard',
    description: 'User exported a financial report.',
    phase: '3',
    keyProperties: ['reportType', 'format'],
  },
  {
    event: AnalyticsEvent.BOOKING_HUB_VIEWED,
    category: 'travel',
    description: 'User opened the booking engine hub.',
    phase: '3',
    keyProperties: ['supportedProductCount', 'supplierCount'],
  },
  {
    event: AnalyticsEvent.BOOKING_SEARCH_PERFORMED,
    category: 'travel',
    description: 'User searched booking offers via the foundation API.',
    phase: '3',
    keyProperties: ['product', 'offerCount'],
  },
  {
    event: AnalyticsEvent.BOOKING_PRICING_VIEWED,
    category: 'travel',
    description: 'User viewed explainable booking pricing for an offer.',
    phase: '3',
    keyProperties: ['product', 'effectiveCostInr'],
  },
  {
    event: AnalyticsEvent.BOOKING_CHANNEL_RECOMMENDED,
    category: 'travel',
    description: 'User received ranked booking channels including bank portals.',
    phase: '3',
    keyProperties: ['product', 'channelCount', 'topChannelSlug'],
  },
  {
    event: AnalyticsEvent.BOOKING_PORTAL_HANDOFF_CLICKED,
    category: 'travel',
    description: 'User clicked through to an issuer travel portal.',
    phase: '3',
    keyProperties: ['channelId', 'slug', 'product'],
  },
  {
    event: AnalyticsEvent.BOOKING_OFFER_SELECTED,
    category: 'travel',
    description: 'User selected a flight/hotel offer for detail or availability.',
    phase: '3',
    keyProperties: ['offerId', 'product', 'supplierCode'],
  },
  {
    event: AnalyticsEvent.BOOKING_FARE_VALIDATED,
    category: 'travel',
    description: 'User revalidated a fare before payment.',
    phase: '3',
    keyProperties: ['offerId', 'outcome', 'priceDeltaInr'],
  },
  {
    event: AnalyticsEvent.BOOKING_PAYMENT_OPTIMIZED,
    category: 'travel',
    description: 'User received card-optimized payment ranking for an offer.',
    phase: '3',
    keyProperties: ['product', 'cardCount'],
  },
  {
    event: AnalyticsEvent.BOOKING_LOYALTY_OPTIMIZED,
    category: 'travel',
    description: 'User compared hotel loyalty earn/redeem/portal paths.',
    phase: '3',
    keyProperties: ['pathCount', 'recommendedPath'],
  },
  {
    event: AnalyticsEvent.EXPERIMENT_EXPOSED,
    category: 'experiment',
    description: 'User assigned to an experiment variant (exposure).',
    phase: '2',
    keyProperties: ['experimentKey', 'variant', 'surface'],
  },
  {
    event: AnalyticsEvent.CARD_DATA_GAP,
    category: 'card',
    description: 'Catalog gap signal for card intelligence triage.',
    phase: '1',
    keyProperties: ['gapType', 'cardId'],
  },
  {
    event: AnalyticsEvent.MERCHANT_DATA_GAP,
    category: 'merchant',
    description: 'Catalog gap signal for merchant intelligence triage.',
    phase: '1',
    keyProperties: ['gapType', 'query'],
  },
];
