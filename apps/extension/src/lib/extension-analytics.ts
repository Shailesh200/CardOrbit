const POSTHOG_HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? 'https://app.posthog.com';
const POSTHOG_API_KEY = import.meta.env.VITE_POSTHOG_API_KEY as string | undefined;

/** Lightweight PostHog capture for the extension (M-034). */
export function captureExtensionEvent(event: string, properties: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();

  if (POSTHOG_API_KEY && typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const body = JSON.stringify({
      api_key: POSTHOG_API_KEY,
      event,
      properties: { ...properties, $lib: 'extension' },
      distinct_id: 'anonymous',
      timestamp,
    });
    navigator.sendBeacon(`${POSTHOG_HOST.replace(/\/$/, '')}/capture/`, body);
    return;
  }

  if (import.meta.env.DEV) {
    console.debug('[extension-analytics]', { event, properties, timestamp });
  }
}

export function trackExtensionOpened(properties: {
  surface: 'popup' | 'overlay';
  merchantSlug?: string;
}): void {
  captureExtensionEvent('EXTENSION_OPENED', properties);
}

export function trackExtensionMerchantDetected(properties: {
  merchantSlug: string;
  merchantHostname?: string;
  tabUrl?: string;
}): void {
  captureExtensionEvent('EXTENSION_MERCHANT_DETECTED', properties);
}

export function trackExtensionOverlayViewed(properties: {
  merchantSlug: string;
  merchantName?: string;
  amount?: number;
  amountDetected?: boolean;
  recommendedCardId?: string;
  recommendationId?: string;
}): void {
  captureExtensionEvent('EXTENSION_OVERLAY_VIEWED', properties);
}

export function trackExtensionOverlayInteraction(properties: {
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
}): void {
  captureExtensionEvent('EXTENSION_OVERLAY_INTERACTION', properties);
}
