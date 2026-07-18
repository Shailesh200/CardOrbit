import { test, expect } from '@playwright/test';

import { seedAuthSession, seedConsentAccepted } from './helpers/auth';
import { stubConsumerApi } from './helpers/api-stubs';
import { expectNoUiLeaks } from './helpers/ui-leaks';

test.describe('catalog consider section', () => {
  test('dashboard shows Cards to consider from catalogRecommendation', async ({ page }) => {
    await seedConsentAccepted(page);
    await seedAuthSession(page);
    await stubConsumerApi(page, 'happy');

    await page.goto('/account');

    const consider = page.getByText('Cards to consider', { exact: true });
    await expect(consider).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Axis Ace')).toBeVisible();
    await expect(page.getByRole('link', { name: /add card/i }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /account section unavailable/i })).toHaveCount(0);

    await expectNoUiLeaks(page);
  });
});
