import posthog from 'posthog-js';

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

function capture(event: string, properties: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.debug('[analytics]', { event, properties });
  }
  posthog.capture(event, properties);
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
