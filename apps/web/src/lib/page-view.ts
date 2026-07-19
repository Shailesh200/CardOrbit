/** Pure helpers for PAGE_VIEWED analytics (safe to unit test). */

const SENSITIVE_QUERY_KEYS = new Set([
  'token',
  'code',
  'state',
  'access_token',
  'refresh_token',
  'id_token',
  'password',
]);

export function normalizeAnalyticsPath(pathname: string): string {
  if (!pathname) return '/';
  const trimmed = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  return trimmed || '/';
}

/** Query param keys only (no values). Drops sensitive keys; truncates length. */
export function analyticsSearchKeys(search: string): string | undefined {
  const raw = search.startsWith('?') ? search.slice(1) : search;
  if (!raw) return undefined;
  const keys = [
    ...new Set(
      raw
        .split('&')
        .map((part) => decodeURIComponent(part.split('=')[0] ?? '').trim())
        .filter((key) => key && !SENSITIVE_QUERY_KEYS.has(key.toLowerCase())),
    ),
  ].sort();
  if (keys.length === 0) return undefined;
  const joined = keys.join(',');
  return joined.length > 120 ? `${joined.slice(0, 117)}...` : joined;
}

export function classifyAnalyticsHost(input: {
  isLandingHost: boolean;
  isAppHost: boolean;
}): 'landing' | 'app' | 'other' {
  if (input.isLandingHost) return 'landing';
  if (input.isAppHost) return 'app';
  return 'other';
}
