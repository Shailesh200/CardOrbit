import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { isAuthenticated } from '@cardwise/auth';

import { HeroLogo } from '@brand/HeroLogo';
import { DASHBOARD_PATH } from '../features/dashboard/dashboard-path';
import {
  getAppOrigin,
  getLandingOrigin,
  isAppOnlyPath,
  isBrowserOnAppHost,
  isBrowserOnLandingHost,
  isLandingOnlyPath,
  isLocalDevHost,
} from '../lib/site-origins';

type GateState =
  | { status: 'idle' }
  | { status: 'redirecting'; label: string }
  | { status: 'error'; message: string };

const IDLE: GateState = { status: 'idle' };

/**
 * Enforces cardorbit.in (landing) vs app.cardorbit.in (auth + account).
 * No-op on localhost so local Vite keeps a single origin. Shows a brief
 * interstitial during cross-origin handoffs, and a human error if the
 * target origin can't be resolved in production (misconfigured env).
 */
export function HostGate() {
  const location = useLocation();
  const navigate = useNavigate();
  const [gate, setGate] = useState<GateState>(IDLE);

  useEffect(() => {
    if (typeof window === 'undefined' || isLocalDevHost()) return;

    const { pathname, search, hash } = location;
    const suffix = `${pathname}${search}${hash}`;

    if (isBrowserOnLandingHost() && isAppOnlyPath(pathname)) {
      const origin = getAppOrigin();
      if (!origin) {
        setGate({
          status: 'error',
          message: "We couldn't determine the CardOrbit app address. Please try again shortly.",
        });
        return;
      }
      setGate({ status: 'redirecting', label: 'Taking you to your CardOrbit account…' });
      window.location.replace(`${origin}${suffix}`);
      return;
    }

    if (isBrowserOnAppHost() && isLandingOnlyPath(pathname)) {
      const landing = getLandingOrigin();
      if (!landing) {
        setGate({
          status: 'error',
          message: "We couldn't determine the CardOrbit website address. Please try again shortly.",
        });
        return;
      }
      setGate({ status: 'redirecting', label: 'Taking you to CardOrbit…' });
      window.location.replace(`${landing}${suffix}`);
      return;
    }

    if (isBrowserOnAppHost() && pathname === '/') {
      if (isAuthenticated()) {
        navigate(DASHBOARD_PATH, { replace: true });
        setGate(IDLE);
        return;
      }
      const landing = getLandingOrigin();
      if (!landing) {
        setGate({
          status: 'error',
          message: "We couldn't determine the CardOrbit website address. Please try again shortly.",
        });
        return;
      }
      setGate({ status: 'redirecting', label: 'Taking you to CardOrbit…' });
      window.location.replace(`${landing}/`);
      return;
    }

    setGate(IDLE);
  }, [location, navigate]);

  if (gate.status === 'idle') return null;

  return (
    <div
      role={gate.status === 'error' ? 'alert' : 'status'}
      aria-live="polite"
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-4 bg-[#050816] px-6 text-center text-white"
    >
      <HeroLogo size="sm" tone="light" linked={false} />
      {gate.status === 'redirecting' ? (
        <>
          <div
            aria-hidden
            className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80"
          />
          <p className="text-sm text-white/70">{gate.label}</p>
        </>
      ) : (
        <div className="max-w-sm space-y-2">
          <p className="font-display text-lg font-semibold">Something isn't configured right</p>
          <p className="text-sm text-white/70">{gate.message}</p>
        </div>
      )}
    </div>
  );
}
