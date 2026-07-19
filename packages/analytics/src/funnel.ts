import { AnalyticsEvent } from './events';
import type {
  AuthLoginFailedProperties,
  AuthPageViewedProperties,
  EmailVerifiedProperties,
  GmailConnectedProperties,
  GmailSyncCompletedProperties,
  GmailSyncStartedProperties,
  MarketingCtaClickedProperties,
  PageViewedProperties,
  SessionStartedProperties,
  UserLoggedInProperties,
  UserLoggedOutProperties,
} from './events';
import { trackEvent, type TrackEventOptions } from './track';

export function trackUserLoggedIn(properties: UserLoggedInProperties, options?: TrackEventOptions) {
  return trackEvent(AnalyticsEvent.USER_LOGGED_IN, properties, options);
}

export function trackUserLoggedOut(
  properties: UserLoggedOutProperties,
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.USER_LOGGED_OUT, properties, options);
}

export function trackEmailVerified(
  properties: EmailVerifiedProperties,
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.EMAIL_VERIFIED, properties, options);
}

export function trackAuthLoginFailed(
  properties: AuthLoginFailedProperties,
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.AUTH_LOGIN_FAILED, properties, options);
}

export function trackAuthPageViewed(
  properties: AuthPageViewedProperties,
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.AUTH_PAGE_VIEWED, properties, options);
}

/** Server/tests: typed PAGE_VIEWED. Web client emits `$pageview` instead (see trackPageViewedClient). */
export function trackPageViewed(properties: PageViewedProperties, options?: TrackEventOptions) {
  return trackEvent(AnalyticsEvent.PAGE_VIEWED, properties, options);
}

export function trackMarketingCtaClicked(
  properties: MarketingCtaClickedProperties,
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.MARKETING_CTA_CLICKED, properties, options);
}

export function trackSessionStarted(
  properties: SessionStartedProperties,
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.SESSION_STARTED, properties, options);
}

export function trackGmailConnected(
  properties: GmailConnectedProperties,
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.GMAIL_CONNECTED, properties, options);
}

export function trackGmailSyncStarted(
  properties: GmailSyncStartedProperties,
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.GMAIL_SYNC_STARTED, properties, options);
}

export function trackGmailSyncCompleted(
  properties: GmailSyncCompletedProperties,
  options?: TrackEventOptions,
) {
  return trackEvent(AnalyticsEvent.GMAIL_SYNC_COMPLETED, properties, options);
}
