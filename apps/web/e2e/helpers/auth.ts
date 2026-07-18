import type { Page } from '@playwright/test';

const ACCESS_KEY = 'cardwise.consumer.accessToken';
const REFRESH_KEY = 'cardwise.consumer.refreshToken';
const CONSENT_KEY = 'cardwise.consent';

/** Seed a fake consumer session (RequireAuth only checks token presence). */
export async function seedAuthSession(page: Page): Promise<void> {
  await page.addInitScript(
    ({ accessKey, refreshKey }) => {
      localStorage.setItem(accessKey, 'e2e-access-token');
      localStorage.setItem(refreshKey, 'e2e-refresh-token');
    },
    { accessKey: ACCESS_KEY, refreshKey: REFRESH_KEY },
  );
}

/** Dismiss consent dialog so it never blocks account chrome in tests. */
export async function seedConsentAccepted(page: Page): Promise<void> {
  await page.addInitScript(
    ({ consentKey }) => {
      localStorage.setItem(
        consentKey,
        JSON.stringify({
          necessary: true,
          analytics: false,
          decidedAt: new Date().toISOString(),
        }),
      );
    },
    { consentKey: CONSENT_KEY },
  );
}

export async function clearAuthSession(page: Page): Promise<void> {
  await page.evaluate(
    ({ accessKey, refreshKey }) => {
      localStorage.removeItem(accessKey);
      localStorage.removeItem(refreshKey);
    },
    { accessKey: ACCESS_KEY, refreshKey: REFRESH_KEY },
  );
}
