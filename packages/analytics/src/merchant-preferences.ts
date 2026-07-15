import { AnalyticsEvent } from './events';
import { trackEvent, type TrackEventOptions } from './track';

export function trackMerchantFavorited(
  properties: {
    merchantId: string;
    merchantSlug?: string;
    merchantName?: string;
    source?: 'web' | 'dashboard';
  },
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.MERCHANT_FAVORITED, properties, options);
}

export function trackMerchantUnfavorited(
  properties: {
    merchantId: string;
    merchantSlug?: string;
    merchantName?: string;
    source?: 'web' | 'dashboard';
  },
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.MERCHANT_UNFAVORITED, properties, options);
}

export function trackSavedSearchCreated(
  properties: {
    savedSearchId: string;
    name: string;
    query?: string;
    categorySlug?: string | null;
  },
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.SAVED_SEARCH_CREATED, properties, options);
}

export function trackSavedSearchRun(
  properties: {
    savedSearchId: string;
    name: string;
    query?: string;
    categorySlug?: string | null;
    resultCount?: number;
  },
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.SAVED_SEARCH_RUN, properties, options);
}
