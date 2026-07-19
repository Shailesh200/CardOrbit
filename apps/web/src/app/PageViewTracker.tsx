import { useEffect } from 'react';
import { useLocation } from 'react-router';

import { useAuthSession } from '../hooks/useAuthSession';
import { trackPageViewedClient } from '../lib/product-analytics';
import {
  analyticsSearchKeys,
  classifyAnalyticsHost,
  normalizeAnalyticsPath,
} from '../lib/page-view';
import { isBrowserOnAppHost, isBrowserOnLandingHost } from '../lib/site-origins';

/** Emits PAGE_VIEWED on every client route change (consent-gated). */
export function PageViewTracker() {
  const { pathname, search } = useLocation();
  const isAuthenticated = useAuthSession();

  useEffect(() => {
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
  }, [pathname, search, isAuthenticated]);

  return null;
}
