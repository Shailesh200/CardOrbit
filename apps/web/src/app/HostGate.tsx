import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { isAuthenticated } from '@cardwise/auth';

import { DASHBOARD_PATH } from '../features/dashboard/dashboard-path';
import {
  getAppOrigin,
  getLandingOrigin,
  isAppOnlyPath,
  isBrowserOnAppHost,
  isBrowserOnLandingHost,
  isLocalDevHost,
} from '../lib/site-origins';

/**
 * Enforces cardorbit.in (landing) vs app.cardorbit.in (auth + account).
 * No-op on localhost so local Vite keeps a single origin.
 */
export function HostGate() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === 'undefined' || isLocalDevHost()) return;

    const { pathname, search, hash } = location;
    const suffix = `${pathname}${search}${hash}`;

    if (isBrowserOnLandingHost() && isAppOnlyPath(pathname)) {
      const origin = getAppOrigin();
      if (origin) {
        window.location.replace(`${origin}${suffix}`);
      }
      return;
    }

    if (isBrowserOnAppHost() && pathname === '/') {
      if (isAuthenticated()) {
        navigate(DASHBOARD_PATH, { replace: true });
        return;
      }
      const landing = getLandingOrigin();
      if (landing) {
        window.location.replace(`${landing}/`);
      }
    }
  }, [location, navigate]);

  return null;
}
