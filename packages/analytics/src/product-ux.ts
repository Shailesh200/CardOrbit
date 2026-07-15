import { AnalyticsEvent } from './events';
import { trackEvent, type TrackEventOptions } from './track';

export function trackAlternativeCardSelected(
  properties: {
    merchantId?: string;
    merchantName?: string;
    category?: string;
    amount?: number;
    recommendedCardId: string;
    expectedReward?: number;
    previousRecommendedCardId?: string;
    rank?: number;
    availableCardIds?: string[];
  },
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.ALTERNATIVE_CARD_SELECTED, properties, options);
}

export function trackDashboardWidgetInteraction(
  properties: {
    widgetId: string;
    action: 'shown' | 'hidden' | 'clicked' | 'customized';
    source?: 'dashboard';
  },
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.DASHBOARD_WIDGET_INTERACTION, properties, options);
}

export function trackPersonalizedHomepageViewed(
  properties: {
    sectionCount: number;
    actionCount: number;
    expiringRewardCount: number;
    milestoneCount: number;
    hasTravelContext: boolean;
    recentActivityCount: number;
  },
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.PERSONALIZED_HOMEPAGE_VIEWED, properties, options);
}

export function trackNotificationsViewed(
  properties: {
    total: number;
    unreadCount: number;
    contextualEnabled: boolean;
  },
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.NOTIFICATIONS_VIEWED, properties, options);
}

export function trackNotificationDelivered(
  properties: {
    type: string;
    channel: 'in_app' | 'email';
    priority?: 'high' | 'medium' | 'low';
  },
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.NOTIFICATION_DELIVERED, properties, options);
}

export function trackNotificationClicked(
  properties: {
    notificationId: string;
    type: string;
    linkUrl?: string;
  },
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.NOTIFICATION_CLICKED, properties, options);
}

export function trackContextualNotificationsSynced(
  properties: {
    delivered: number;
    candidates: number;
    skipped: number;
  },
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.CONTEXTUAL_NOTIFICATIONS_SYNCED, properties, options);
}

export function trackFinancialCalendarViewed(
  properties: {
    year: number;
    month: number;
    eventCount: number;
    view: 'month' | 'agenda';
  },
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.FINANCIAL_CALENDAR_VIEWED, properties, options);
}

export function trackFinancialTimelineViewed(
  properties: {
    page: number;
    pageSize: number;
    total: number;
    category?: string;
  },
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.FINANCIAL_TIMELINE_VIEWED, properties, options);
}

export function trackCalendarReminderCreated(
  properties: {
    priority: 'high' | 'medium' | 'low';
    reminderOffsetDays: number;
  },
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.CALENDAR_REMINDER_CREATED, properties, options);
}

export function trackReportsHubViewed(
  properties: {
    period: string;
    sectionCount: number;
    kpiCount: number;
  },
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.REPORTS_HUB_VIEWED, properties, options);
}

export function trackReportViewed(
  properties: {
    reportType: string;
    period: string;
  },
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.REPORT_VIEWED, properties, options);
}

export function trackReportExported(
  properties: {
    reportType: string;
    format: 'csv';
  },
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.REPORT_EXPORTED, properties, options);
}

export function trackBookingHubViewed(
  properties: {
    supportedProductCount: number;
    supplierCount: number;
  },
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.BOOKING_HUB_VIEWED, properties, options);
}

export function trackBookingSearchPerformed(
  properties: {
    product: 'FLIGHT' | 'HOTEL';
    offerCount: number;
    supplierCount: number;
  },
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.BOOKING_SEARCH_PERFORMED, properties, options);
}

export function trackBookingPricingViewed(
  properties: {
    product: 'FLIGHT' | 'HOTEL';
    effectiveCostInr: number;
  },
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.BOOKING_PRICING_VIEWED, properties, options);
}

export function trackBookingChannelRecommended(
  properties: {
    product: 'FLIGHT' | 'HOTEL';
    channelCount: number;
    topChannelSlug: string | null;
    portalCount: number;
  },
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.BOOKING_CHANNEL_RECOMMENDED, properties, options);
}

export function trackBookingPortalHandoffClicked(
  properties: {
    channelId: string;
    slug: string;
    product: 'FLIGHT' | 'HOTEL';
  },
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.BOOKING_PORTAL_HANDOFF_CLICKED, properties, options);
}

export function trackBookingOfferSelected(
  properties: {
    offerId: string;
    product: 'FLIGHT' | 'HOTEL';
    supplierCode: string;
  },
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.BOOKING_OFFER_SELECTED, properties, options);
}

export function trackBookingFareValidated(
  properties: {
    offerId: string;
    outcome: string;
    priceDeltaInr: number;
  },
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.BOOKING_FARE_VALIDATED, properties, options);
}

export function trackBookingPaymentOptimized(
  properties: {
    product: 'FLIGHT' | 'HOTEL';
    cardCount: number;
    recommendedUserCardId: string | null;
  },
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.BOOKING_PAYMENT_OPTIMIZED, properties, options);
}

export function trackBookingLoyaltyOptimized(
  properties: {
    pathCount: number;
    recommendedPath: string | null;
    offerId: string | null;
  },
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.BOOKING_LOYALTY_OPTIMIZED, properties, options);
}

export function trackExperimentExposed(
  properties: {
    experimentKey: string;
    variant: string;
    surface?: 'web' | 'extension' | 'api';
  },
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.EXPERIMENT_EXPOSED, properties, options);
}
