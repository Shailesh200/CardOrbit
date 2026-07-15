import { isAuthenticated } from '@cardwise/auth';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useEffect, useState } from 'react';

import { getOnboardingState } from '../onboarding/onboarding-api';
import { isOnboardingAllowedAccountPath, needsOnboardingGate } from '../onboarding/onboarding-gate';

/**
 * Protects routes that require auth. Incomplete onboarding users are redirected
 * to `/onboarding` (unless already there).
 */
export function RequireAuth({ skipOnboardingGate = false }: { skipOnboardingGate?: boolean }) {
  const location = useLocation();
  const [checking, setChecking] = useState(!skipOnboardingGate);
  const [redirectToOnboarding, setRedirectToOnboarding] = useState(false);

  useEffect(() => {
    if (skipOnboardingGate || !isAuthenticated()) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const state = await getOnboardingState();
        if (!cancelled) {
          setRedirectToOnboarding(needsOnboardingGate(state));
        }
      } catch {
        if (!cancelled) setRedirectToOnboarding(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [skipOnboardingGate, location.pathname]);

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (checking) {
    return (
      <p className="px-4 py-16 text-center text-sm text-muted-foreground">Checking account…</p>
    );
  }

  if (redirectToOnboarding && location.pathname !== '/onboarding') {
    if (isOnboardingAllowedAccountPath(location.pathname)) {
      return <Outlet />;
    }
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
