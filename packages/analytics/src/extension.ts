import { AnalyticsEvent } from './events';
import { trackEvent, type TrackEventOptions } from './track';

export function trackExtensionOpened(
  properties: {
    surface: 'popup' | 'overlay';
    merchantSlug?: string;
  },
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.EXTENSION_OPENED, properties, options);
}

export function trackExtensionMerchantDetected(
  properties: {
    merchantSlug: string;
    merchantHostname?: string;
    tabUrl?: string;
  },
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.EXTENSION_MERCHANT_DETECTED, properties, options);
}

export function trackExtensionOverlayViewed(
  properties: {
    merchantSlug: string;
    merchantName?: string;
    amount?: number;
    amountDetected?: boolean;
    recommendedCardId?: string;
    recommendationId?: string;
  },
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.EXTENSION_OVERLAY_VIEWED, properties, options);
}

export function trackExtensionOverlayInteraction(
  properties: {
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
  },
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.EXTENSION_OVERLAY_INTERACTION, properties, options);
}
