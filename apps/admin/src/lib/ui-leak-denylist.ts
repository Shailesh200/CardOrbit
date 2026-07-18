/** Shared denylist — keep in sync with apps/web/src/lib/ui-leak-denylist.ts. */
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

export function looksLikeUiLeak(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  return UI_LEAK_PATTERNS.some((pattern) => pattern.test(trimmed));
}
