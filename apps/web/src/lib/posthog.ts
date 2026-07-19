import posthog from 'posthog-js';
import { getAccessToken } from '@cardwise/auth';

import { getConsentPreferences } from '../features/privacy/consent-storage';

const API_KEY = import.meta.env.VITE_POSTHOG_API_KEY as string | undefined;
const HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? 'https://us.i.posthog.com';

function decodeJwtClaims(token: string): { sub: string; email: string } | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const payload = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof payload.sub === 'string' && typeof payload.email === 'string') {
      return { sub: payload.sub, email: payload.email };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Call once at app bootstrap (browser only). Initialises the posthog-js singleton,
 * respects the existing cookie-consent gate, and re-identifies any already-logged-in
 * user so page-refresh events are attributed correctly.
 */
export function initPostHog(): void {
  if (typeof window === 'undefined' || !API_KEY) return;

  const hasConsent = getConsentPreferences()?.analytics === true;

  posthog.init(API_KEY, {
    api_host: HOST,
    defaults: '2026-05-30',
    opt_out_capturing_by_default: !hasConsent,
  });

  const token = getAccessToken();
  if (token) {
    const claims = decodeJwtClaims(token);
    if (claims) {
      posthog.identify(claims.sub, { email: claims.email });
    }
  }
}
