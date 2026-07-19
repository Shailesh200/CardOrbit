import { useEffect } from 'react';

import { getProfile } from '../features/account/account-api';
import { CONSENT_CHANGED_EVENT } from '../features/privacy/consent-storage';
import { useAuthSession } from '../hooks/useAuthSession';
import { identifyAnalyticsPerson } from '../lib/product-analytics';

function identifyFromProfile(): void {
  void getProfile()
    .then((profile) => {
      identifyAnalyticsPerson({
        email: profile.email,
        fullName: profile.fullName,
        firstName: profile.firstName,
        lastName: profile.lastName,
      });
    })
    .catch(() => {
      // Profile may be unavailable during auth transitions; skip quietly.
    });
}

/** Sets PostHog person email/name so Persons shows display names instead of IDs. */
export function AnalyticsIdentify() {
  const isAuthenticated = useAuthSession();

  useEffect(() => {
    if (!isAuthenticated) return;
    identifyFromProfile();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const onConsent = (event: Event) => {
      const analytics = (event as CustomEvent<{ analytics?: boolean }>).detail?.analytics;
      if (analytics !== true) return;
      identifyFromProfile();
    };
    window.addEventListener(CONSENT_CHANGED_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, onConsent);
  }, [isAuthenticated]);

  return null;
}
