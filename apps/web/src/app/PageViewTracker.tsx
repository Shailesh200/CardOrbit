import { useEffect } from 'react';
import { useLocation } from 'react-router';

import { useAuthSession } from '../hooks/useAuthSession';
import { CONSENT_CHANGED_EVENT } from '../features/privacy/consent-storage';
import { trackPageViewedClient } from '../lib/product-analytics';
import {
  analyticsSearchKeys,
  classifyAnalyticsHost,
  normalizeAnalyticsPath,
} from '../lib/page-view';
import { isBrowserOnAppHost, isBrowserOnLandingHost } from '../lib/site-origins';

function emitPageView(pathname: string, search: string, isAuthenticated: boolean): void {
  if (typeof window === 'undefined') return;
  trackPageViewedClient({
    path: normalizeAnalyticsPath(pathname),
    host: classifyAnalyticsHost({
      isLandingHost: isBrowserOnLandingHost(),
      isAppHost: isBrowserOnAppHost(),
    }),
    isAuthenticated,
    search: analyticsSearchKeys(search),
    referrer: document.referrer || undefined,
  });
}

/** Emits PAGE_VIEWED on every client route change (consent-gated). */
export function PageViewTracker() {
  const { pathname, search } = useLocation();
  const isAuthenticated = useAuthSession();

  useEffect(() => {
    emitPageView(pathname, search, isAuthenticated);
  }, [pathname, search, isAuthenticated]);

  // First landing pageview is skipped until consent; re-emit after Accept all.
  useEffect(() => {
    const onConsent = (event: Event) => {
      const analytics = (event as CustomEvent<{ analytics?: boolean }>).detail?.analytics;
      if (analytics !== true) return;
      emitPageView(pathname, search, isAuthenticated);
    };
    window.addEventListener(CONSENT_CHANGED_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, onConsent);
  }, [pathname, search, isAuthenticated]);

  return null;
}
