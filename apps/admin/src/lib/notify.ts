/**
 * Admin-wide notify helpers — semantic toasts with leak suppression.
 * Slim port of apps/web/src/lib/app-toast.ts (admin has no @cardwise/auth dependency).
 * Styling is configured on `<Toaster />` in AdminShell.
 */
import { toast as sonnerToast } from '@cardwise/ui';

import { looksLikeUiLeak } from './ui-leak-denylist';

export { toast } from '@cardwise/ui';

const recent = new Map<string, number>();
const DEDUPE_MS = 1500;

function shouldDedupe(key: string): boolean {
  const now = Date.now();
  const last = recent.get(key);
  if (last != null && now - last < DEDUPE_MS) return true;
  recent.set(key, now);
  return false;
}

/** Exported so pages can sanitize inline error banners the same way toasts are sanitized. */
export function safeMessage(message: string, fallback: string): string {
  const trimmed = message.trim();
  if (!trimmed || looksLikeUiLeak(trimmed)) return fallback;
  return trimmed;
}

/** Marks an error whose message was already surfaced (e.g. session-expiry redirect toast). */
export function isSilentAdminError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'silentToast' in error &&
    (error as { silentToast?: boolean }).silentToast === true
  );
}

export const notify = {
  success(message: string) {
    const text = safeMessage(message, 'Done');
    if (shouldDedupe(`success:${text}`)) return;
    sonnerToast.success(text);
  },
  info(message: string) {
    const text = safeMessage(message, 'Update');
    if (shouldDedupe(`info:${text}`)) return;
    sonnerToast.info(text);
  },
  warning(message: string) {
    const text = safeMessage(message, 'Please check and try again');
    if (shouldDedupe(`warning:${text}`)) return;
    sonnerToast.warning(text);
  },
  error(message: string) {
    const text = safeMessage(message, 'Something went wrong. Please try again.');
    if (shouldDedupe(`error:${text}`)) return;
    sonnerToast.error(text);
  },
  fromError(error: unknown, fallback = 'Something went wrong. Please try again.') {
    if (isSilentAdminError(error)) return;
    const raw = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
    notify.error(safeMessage(raw, fallback));
  },
};
