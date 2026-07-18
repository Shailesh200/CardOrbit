import { test, expect } from '@playwright/test';

import { seedAuthSession, seedConsentAccepted } from './helpers/auth';
import { stubConsumerApi } from './helpers/api-stubs';
import { expectNoUiLeaks } from './helpers/ui-leaks';

test.describe('offline banner', () => {
  test('shows offline status banner when browser goes offline', async ({ page, context }) => {
    await seedConsentAccepted(page);
    await seedAuthSession(page);
    await stubConsumerApi(page, 'happy');

    await page.goto('/account');
    await expect(page.locator('h1, main, [role="main"]').first()).toBeVisible({ timeout: 15_000 });

    await context.setOffline(true);

    await expect(page.getByRole('status')).toContainText(/you're offline/i, { timeout: 10_000 });
    await expectNoUiLeaks(page);

    await context.setOffline(false);
    await expect(page.getByRole('status').filter({ hasText: /you're offline/i })).toHaveCount(0, {
      timeout: 10_000,
    });
  });
});
