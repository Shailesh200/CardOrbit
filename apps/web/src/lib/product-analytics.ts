/** Browser-safe product analytics (matches @cardwise/analytics event names). */
export function captureProductEvent(event: string, properties: Record<string, unknown>): void {
  const payload = {
    event,
    properties,
    timestamp: new Date().toISOString(),
  };

  const apiKey = import.meta.env.VITE_POSTHOG_API_KEY as string | undefined;
  const host =
    (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? 'https://app.posthog.com';

  if (apiKey && typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const body = JSON.stringify({
      api_key: apiKey,
      event,
      properties: { ...properties, $lib: 'web' },
      distinct_id: 'anonymous',
      timestamp: payload.timestamp,
    });
    navigator.sendBeacon(`${host.replace(/\/$/, '')}/capture/`, body);
    return;
  }

  if (import.meta.env.DEV) {
    console.debug('[analytics]', payload);
  }
}

export function trackAlternativeCardSelectedClient(properties: {
  merchantId?: string;
  merchantName?: string;
  category?: string;
  amount?: number;
  recommendedCardId: string;
  expectedReward?: number;
  previousRecommendedCardId?: string;
  rank?: number;
}): void {
  captureProductEvent('ALTERNATIVE_CARD_SELECTED', properties);
}

export function trackMerchantFavoritedClient(properties: {
  merchantId: string;
  merchantSlug?: string;
  merchantName?: string;
  source?: 'web' | 'dashboard';
}): void {
  captureProductEvent('MERCHANT_FAVORITED', properties);
}

export function trackMerchantUnfavoritedClient(properties: {
  merchantId: string;
  merchantSlug?: string;
  merchantName?: string;
  source?: 'web' | 'dashboard';
}): void {
  captureProductEvent('MERCHANT_UNFAVORITED', properties);
}

export function trackSavedSearchCreatedClient(properties: {
  savedSearchId: string;
  name: string;
  query?: string;
  categorySlug?: string | null;
}): void {
  captureProductEvent('SAVED_SEARCH_CREATED', properties);
}

export function trackSavedSearchRunClient(properties: {
  savedSearchId: string;
  name: string;
  query?: string;
  categorySlug?: string | null;
  resultCount?: number;
}): void {
  captureProductEvent('SAVED_SEARCH_RUN', properties);
}

export function trackDashboardWidgetInteractionClient(properties: {
  widgetId: string;
  action: 'shown' | 'hidden' | 'clicked' | 'customized';
}): void {
  captureProductEvent('DASHBOARD_WIDGET_INTERACTION', properties);
}

export function trackPersonalizedHomepageViewedClient(properties: {
  sectionCount: number;
  actionCount: number;
  expiringRewardCount: number;
  milestoneCount: number;
  hasTravelContext: boolean;
  recentActivityCount: number;
}): void {
  captureProductEvent('PERSONALIZED_HOMEPAGE_VIEWED', properties);
}

export function trackNotificationsViewedClient(properties: {
  total: number;
  unreadCount: number;
  contextualEnabled: boolean;
}): void {
  captureProductEvent('NOTIFICATIONS_VIEWED', properties);
}

export function trackNotificationClickedClient(properties: {
  notificationId: string;
  type: string;
  linkUrl?: string;
}): void {
  captureProductEvent('NOTIFICATION_CLICKED', properties);
}

export function trackExperimentExposedClient(properties: {
  experimentKey: string;
  variant: string;
  surface?: 'web' | 'extension' | 'api';
}): void {
  captureProductEvent('EXPERIMENT_EXPOSED', properties);
}
