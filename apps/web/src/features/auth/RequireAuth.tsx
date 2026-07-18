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
  const [gateError, setGateError] = useState(false);

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
          setGateError(false);
          setRedirectToOnboarding(needsOnboardingGate(state));
        }
      } catch {
        // Fail closed — do not skip onboarding when state cannot be loaded.
        if (!cancelled) {
          setGateError(true);
          setRedirectToOnboarding(true);
        }
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

  if (gateError && location.pathname !== '/onboarding') {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-16 text-center">
        <p className="font-display text-lg font-semibold">Could not verify your account setup</p>
        <p className="text-sm text-muted-foreground">
          We could not load your onboarding status. Check your connection and try again.
        </p>
        <button
          type="button"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          onClick={() => {
            setChecking(true);
            setGateError(false);
            void getOnboardingState()
              .then((state) => {
                setRedirectToOnboarding(needsOnboardingGate(state));
                setGateError(false);
              })
              .catch(() => setGateError(true))
              .finally(() => setChecking(false));
          }}
        >
          Try again
        </button>
      </div>
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
