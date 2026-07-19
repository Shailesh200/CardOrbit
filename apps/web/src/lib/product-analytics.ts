import { getAccessToken } from '@cardwise/auth';

import { getConsentPreferences } from '../features/privacy/consent-storage';
import { resolvePostHogCaptureUrl } from './posthog-ingest';

/** Decode JWT payload `sub` without verifying (client identity for PostHog only). */
export function resolveAnalyticsDistinctId(): string {
  const token = getAccessToken();
  if (!token) return 'anonymous';
  try {
    const parts = token.split('.');
    if (parts.length < 2) return 'anonymous';
    const json = atob(parts[1]!.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json) as { sub?: unknown };
    return typeof payload.sub === 'string' && payload.sub.length > 0 ? payload.sub : 'anonymous';
  } catch {
    return 'anonymous';
  }
}

function postToPostHog(event: string, properties: Record<string, unknown>): void {
  const apiKey = import.meta.env.VITE_POSTHOG_API_KEY as string | undefined;
  if (!apiKey || typeof window === 'undefined') {
    if (import.meta.env.DEV) {
      console.debug('[analytics] skipped (no api key)', { event, properties });
    }
    return;
  }

  const timestamp = new Date().toISOString();
  const body = JSON.stringify({
    api_key: apiKey,
    event,
    properties: {
      ...properties,
      $lib: 'web',
      distinct_id: resolveAnalyticsDistinctId(),
    },
    distinct_id: resolveAnalyticsDistinctId(),
    timestamp,
  });
  const url = resolvePostHogCaptureUrl(import.meta.env.VITE_POSTHOG_HOST as string | undefined);
  const blob = new Blob([body], { type: 'application/json' });

  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const queued = navigator.sendBeacon(url, blob);
    if (queued) return;
  }

  void fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    /* ignore network errors — analytics must not break UX */
  });
}

/** Browser-safe product analytics (matches @cardwise/analytics event names). */
export function captureProductEvent(event: string, properties: Record<string, unknown>): void {
  const payload = {
    event,
    properties,
    timestamp: new Date().toISOString(),
  };

  // Never beacon to PostHog until the visitor has explicitly opted into analytics cookies.
  if (getConsentPreferences()?.analytics !== true) {
    if (import.meta.env.DEV) {
      console.debug('[analytics] skipped (no consent)', payload);
    }
    return;
  }

  postToPostHog(event, properties);

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

export function trackAuthPageViewedClient(properties: {
  page: 'signup' | 'login' | 'forgot_password' | 'verify_email' | 'reset_password';
  referrer?: string;
}): void {
  captureProductEvent('AUTH_PAGE_VIEWED', properties);
}

export function trackPageViewedClient(properties: {
  path: string;
  host: 'landing' | 'app' | 'other';
  isAuthenticated: boolean;
  search?: string;
  referrer?: string;
}): void {
  captureProductEvent('PAGE_VIEWED', properties);

  // PostHog "Web analytics" only counts $pageview (not custom PAGE_VIEWED).
  if (typeof window !== 'undefined') {
    captureProductEvent('$pageview', {
      $current_url: window.location.href,
      $pathname: properties.path,
      $host: window.location.host,
      $referrer: properties.referrer ?? document.referrer ?? undefined,
      path: properties.path,
      host: properties.host,
      isAuthenticated: properties.isAuthenticated,
      search: properties.search,
    });
  }
}

export function trackMarketingCtaClickedClient(properties: {
  placement: 'hero' | 'nav' | 'below_fold' | 'ai_section';
  cta: string;
  destination: string;
}): void {
  captureProductEvent('MARKETING_CTA_CLICKED', properties);
}

export function trackSessionStartedClient(properties: {
  surface: 'web' | 'extension';
  isAuthenticated: boolean;
  path?: string;
}): void {
  captureProductEvent('SESSION_STARTED', properties);
}

/** Fire once per browser tab for DAU-style session analytics. */
export function maybeTrackWebSessionStarted(isAuthenticated: boolean, path?: string): void {
  if (typeof sessionStorage === 'undefined') return;
  const key = 'cardorbit.session_started';
  if (sessionStorage.getItem(key) === '1') return;
  sessionStorage.setItem(key, '1');
  trackSessionStartedClient({
    surface: 'web',
    isAuthenticated,
    path,
  });
}
