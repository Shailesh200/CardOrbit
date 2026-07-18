/**
 * App-wide notify helpers — semantic toasts with leak suppression.
 * Styling is configured on `<Toaster />` in AppShell.
 */
import { isSilentAuthError } from '@cardwise/auth';
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

function safeMessage(message: string, fallback: string): string {
  const trimmed = message.trim();
  if (!trimmed || looksLikeUiLeak(trimmed)) return fallback;
  return trimmed;
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
  /** Persistent toast with action (e.g. PWA reload). */
  action(message: string, actionLabel: string, onAction: () => void) {
    const text = safeMessage(message, 'Update available');
    if (shouldDedupe(`action:${text}`)) return;
    sonnerToast(text, {
      duration: Infinity,
      action: {
        label: actionLabel,
        onClick: onAction,
      },
    });
  },
  fromError(error: unknown, fallback = 'Something went wrong. Please try again.') {
    if (isSilentAuthError(error)) return;
    const raw = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
    notify.error(safeMessage(raw, fallback));
  },
};
