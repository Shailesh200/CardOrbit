import { getAnalyticsClient } from './client';
import type { AnalyticsEventName, EventPropertiesMap, TrackedEvent } from './events';

export type TrackEventOptions = {
  distinctId?: string;
  timestamp?: Date;
};

/**
 * Type-safe product analytics. Apps must use this instead of calling PostHog directly.
 */
export function trackEvent<E extends AnalyticsEventName>(
  event: E,
  properties: EventPropertiesMap[E],
  options: TrackEventOptions = {},
): TrackedEvent<E> {
  const payload: TrackedEvent<E> = {
    event,
    properties,
    distinctId: options.distinctId,
    timestamp: (options.timestamp ?? new Date()).toISOString(),
  };

  void getAnalyticsClient().capture(payload);
  return payload;
}
