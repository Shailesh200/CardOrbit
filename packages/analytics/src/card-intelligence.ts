import { AnalyticsEvent } from './events';
import { trackEvent, type TrackEventOptions } from './track';
import type { CardDataGapProperties } from './events';

export function trackCardDataGap(properties: CardDataGapProperties, options?: TrackEventOptions) {
  return trackEvent(AnalyticsEvent.CARD_DATA_GAP, properties, options);
}
