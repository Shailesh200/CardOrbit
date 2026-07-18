/**
 * Minimal leak denylist for job/data errors rendered inside SDUI blocks.
 * Keep in sync (in spirit) with apps/web/src/lib/ui-leak-denylist.ts —
 * this package cannot depend on app-level code, so it carries its own copy.
 */
const UI_LEAK_PATTERNS: RegExp[] = [
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
];

function looksLikeLeak(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  return UI_LEAK_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/** Never surface raw stack traces or framework internals — job/data errors must read as human copy. */
export function toSafeMessage(
  message: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  const text = typeof message === 'string' ? message : '';
  const trimmed = text.trim();
  if (!trimmed || looksLikeLeak(trimmed)) return fallback;
  return trimmed;
}
