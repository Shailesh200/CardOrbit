import { AnalyticsEvent } from './events';
import { trackEvent, type TrackEventOptions } from './track';
import type { MerchantDataGapProperties } from './events';

export function trackMerchantDataGap(
  properties: MerchantDataGapProperties,
  options?: TrackEventOptions,
): void {
  trackEvent(AnalyticsEvent.MERCHANT_DATA_GAP, properties, options);
}

export type { MerchantDataGapProperties, MerchantDataGapType } from './events';
