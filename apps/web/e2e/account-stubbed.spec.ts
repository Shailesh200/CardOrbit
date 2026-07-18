import { test, expect } from '@playwright/test';

import { seedAuthSession, seedConsentAccepted } from './helpers/auth';
import { stubConsumerApi } from './helpers/api-stubs';
import { expectNoUiLeaks } from './helpers/ui-leaks';

const ACCOUNT_PATHS = [
  '/account',
  '/account/cards',
  '/account/profile',
  '/account/settings',
  '/account/offers',
  '/account/merchants',
];

test.describe('stubbed account routes', () => {
  test.beforeEach(async ({ page }) => {
    await seedConsentAccepted(page);
    await seedAuthSession(page);
    await stubConsumerApi(page, 'happy');
  });

  for (const path of ACCOUNT_PATHS) {
    test(`${path} loads without UI leaks`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`${path.replace(/\//g, '\\/')}(?:\\?.*)?$`));
      // Account shell or page heading should appear; avoid treating skeletons as failures.
      await expect(page.locator('main, [role="main"], h1').first()).toBeVisible({ timeout: 15_000 });
      await page.waitForTimeout(400);
      await expectNoUiLeaks(page);
    });
  }
});
