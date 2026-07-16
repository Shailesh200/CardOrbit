/** Marketing apex vs authenticated app subdomain. */

const DEFAULT_LANDING = 'https://cardorbit.in';
const DEFAULT_APP = 'https://app.cardorbit.in';

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

function normalizeHost(hostname: string): string {
  return hostname.replace(/^www\./, '').toLowerCase();
}

export function isLocalDevHost(hostname = typeof window !== 'undefined' ? window.location.hostname : ''): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local');
}

export function getLandingOrigin(): string {
  const fromEnv = import.meta.env.VITE_LANDING_ORIGIN?.trim();
  if (fromEnv) return stripTrailingSlash(fromEnv);
  if (import.meta.env.DEV) return '';
  return DEFAULT_LANDING;
}

export function getAppOrigin(): string {
  const fromEnv = import.meta.env.VITE_APP_ORIGIN?.trim();
  if (fromEnv) return stripTrailingSlash(fromEnv);
  if (import.meta.env.DEV) return '';
  return DEFAULT_APP;
}

export function isBrowserOnLandingHost(): boolean {
  if (typeof window === 'undefined') return false;
  if (isLocalDevHost()) return false;
  const landing = getLandingOrigin();
  if (!landing) return false;
  try {
    return normalizeHost(window.location.hostname) === normalizeHost(new URL(landing).hostname);
  } catch {
    return false;
  }
}

export function isBrowserOnAppHost(): boolean {
  if (typeof window === 'undefined') return false;
  if (isLocalDevHost()) return true;
  const app = getAppOrigin();
  if (!app) return true;
  try {
    return normalizeHost(window.location.hostname) === normalizeHost(new URL(app).hostname);
  } catch {
    return true;
  }
}

/** Auth / account paths that must live on the app subdomain. */
export function isAppOnlyPath(pathname: string): boolean {
  const appPrefixes = [
    '/login',
    '/signup',
    '/verify-email',
    '/forgot-password',
    '/reset-password',
    '/oauth',
    '/onboarding',
    '/account',
  ];
  return appPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/** Absolute app URL when on the landing host; otherwise a same-origin path. */
export function appHref(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (!isBrowserOnLandingHost()) return normalized;
  const origin = getAppOrigin();
  return origin ? `${origin}${normalized}` : normalized;
}

/** Absolute landing URL when on the app host; otherwise a same-origin path. */
export function landingHref(path = '/'): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (!isBrowserOnAppHost() || isLocalDevHost()) return normalized;
  const origin = getLandingOrigin();
  return origin ? `${origin}${normalized}` : normalized;
}
