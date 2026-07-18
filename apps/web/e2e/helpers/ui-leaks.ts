import { expect, type Page } from '@playwright/test';

/**
 * Keep in sync with `apps/web/src/lib/ui-leak-denylist.ts`.
 * Duplicated here so Playwright does not need a Vite/TS path into src.
 */
export const UI_LEAK_PATTERNS: RegExp[] = [
  /\bUnauthorized\b/i,
  /\bForbidden\b/i,
  /\bInternal Server Error\b/i,
  /Request failed\s*\(/i,
  /\bTypeError\b/,
  /\bECONNREFUSED\b/i,
  /\bfetch failed\b/i,
  /\bPrisma\b/,
  /\bNest(JS)?\b/i,
  /at\s+\S+\s+\(/,
  /^\s*\{[\s\S]*"statusCode"\s*:/,
  /\bworkbox\b/i,
  /\bserviceWorker\b/i,
];

/** Assert visible page + toast text contains no denylisted leak strings. */
export async function expectNoUiLeaks(page: Page): Promise<void> {
  const bodyText = await page.locator('body').innerText();
  for (const pattern of UI_LEAK_PATTERNS) {
    expect(bodyText, `UI leak matched ${pattern}`).not.toMatch(pattern);
  }

  const toasts = page.locator('[data-sonner-toast]');
  const toastCount = await toasts.count();
  for (let i = 0; i < toastCount; i += 1) {
    const toastText = (await toasts.nth(i).innerText()).trim();
    if (!toastText) continue;
    for (const pattern of UI_LEAK_PATTERNS) {
      expect(toastText, `Toast leak matched ${pattern}`).not.toMatch(pattern);
    }
  }
}
