import { test, expect } from '@playwright/test';

import { seedConsentAccepted } from './helpers/auth';
import { stubConsumerApi } from './helpers/api-stubs';
import { expectNoUiLeaks } from './helpers/ui-leaks';

test.describe('public smoke', () => {
  test.beforeEach(async ({ page }) => {
    await seedConsentAccepted(page);
    await stubConsumerApi(page, 'happy');
  });

  test('home `/` renders without UI leaks', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('link', { name: /sign in/i }).first()).toBeVisible();
    await expectNoUiLeaks(page);
  });

  test('login `/login` renders without UI leaks', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#login-email')).toBeVisible();
    await expectNoUiLeaks(page);
  });
});
