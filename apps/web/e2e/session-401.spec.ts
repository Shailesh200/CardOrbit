import { test, expect } from '@playwright/test';

import { seedAuthSession, seedConsentAccepted } from './helpers/auth';
import { stubConsumerApi } from './helpers/api-stubs';
import { expectNoUiLeaks } from './helpers/ui-leaks';

test.describe('session 401', () => {
  test('expired session redirects to login without Unauthorized toast leak', async ({ page }) => {
    await seedConsentAccepted(page);
    await seedAuthSession(page);
    await stubConsumerApi(page, 'session401');

    await page.goto('/account');

    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible({
      timeout: 15_000,
    });

    // Friendly session copy may appear once; raw "Unauthorized" must never surface.
    await expect(page.getByText('Unauthorized', { exact: false })).toHaveCount(0);

    const toasts = page.locator('[data-sonner-toast]');
    const toastCount = await toasts.count();
    let sessionToastCount = 0;
    for (let i = 0; i < toastCount; i += 1) {
      const text = await toasts.nth(i).innerText();
      expect(text).not.toMatch(/\bUnauthorized\b/i);
      if (/session has expired|sign in again/i.test(text)) {
        sessionToastCount += 1;
      }
    }
    expect(sessionToastCount, 'session expiry toast should not duplicate').toBeLessThanOrEqual(1);

    await expectNoUiLeaks(page);
  });
});
