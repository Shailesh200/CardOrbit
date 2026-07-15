type RecommendationEventBase = {
  merchantId?: string;
  merchantName?: string;
  category?: string;
  amount?: number;
  availableCardIds?: string[];
};

export type RecommendationViewedEvent = RecommendationEventBase & {
  recommendedCardId: string;
  expectedReward?: number;
};

export type RecommendationClickedEvent = RecommendationViewedEvent & {
  action: 'accepted' | 'dismissed' | 'ignored';
  clickedCardId?: string;
};

/** Browser-safe product analytics (matches @cardwise/analytics event names). */
function capture(event: string, properties: Record<string, unknown>): void {
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

export function trackRecommendationViewedClient(properties: RecommendationViewedEvent): void {
  capture('RECOMMENDATION_VIEWED', properties);
}

export function trackRecommendationClickedClient(properties: RecommendationClickedEvent): void {
  capture('RECOMMENDATION_CLICKED', properties);
}

export function trackRecommendationFeedbackSubmittedClient(properties: {
  recommendationId: string;
  feedbackType: string;
  merchantName?: string;
}): void {
  capture('RECOMMENDATION_FEEDBACK_SUBMITTED', properties);
}
