import { AnalyticsEvent } from './events';
import { trackEvent, type TrackEventOptions } from './track';
import type {
  RecommendationClickedProperties,
  RecommendationFeedbackSubmittedProperties,
  RecommendationRequestedProperties,
  RecommendationViewedProperties,
} from './events';

export function trackRecommendationRequested(
  properties: RecommendationRequestedProperties,
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.RECOMMENDATION_REQUESTED, properties, options);
}

export function trackRecommendationViewed(
  properties: RecommendationViewedProperties,
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.RECOMMENDATION_VIEWED, properties, options);
}

export function trackRecommendationClicked(
  properties: RecommendationClickedProperties,
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.RECOMMENDATION_CLICKED, properties, options);
}

export function trackRecommendationFeedbackSubmitted(
  properties: RecommendationFeedbackSubmittedProperties,
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.RECOMMENDATION_FEEDBACK_SUBMITTED, properties, options);
}
