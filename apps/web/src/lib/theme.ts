/** Consumer shell light/dark theme — persisted across cardorbit.in hosts. */
export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'cardorbit.theme';
const LEGACY_STORAGE_KEY = 'cardwise.theme';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function isTheme(value: string | null | undefined): value is Theme {
  return value === 'light' || value === 'dark';
}

function cookieDomain(): string | null {
  if (typeof location === 'undefined') return null;
  const host = location.hostname;
  if (host === 'cardorbit.in' || host.endsWith('.cardorbit.in')) {
    return '.cardorbit.in';
  }
  return null;
}

function readThemeCookie(): Theme | null {
  if (typeof document === 'undefined') return null;
  try {
    const match = document.cookie.match(
      /(?:^|;\s*)(?:cardorbit|cardwise)\.theme=(light|dark)(?:;|$)/,
    );
    const value = match?.[1];
    return isTheme(value) ? value : null;
  } catch {
    return null;
  }
}

function writeThemeCookie(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const domain = cookieDomain();
  const parts = [`${STORAGE_KEY}=${theme}`, 'path=/', `max-age=${COOKIE_MAX_AGE}`, 'SameSite=Lax'];
  if (domain) parts.push(`Domain=${domain}`);
  if (location.protocol === 'https:') parts.push('Secure');
  document.cookie = parts.join('; ');
}

export function getStoredTheme(): Theme | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (isTheme(raw)) return raw;
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (isTheme(legacy)) return legacy;
  } catch {
    // Ignore storage errors (private browsing, quota).
  }
  return readThemeCookie();
}

/** CardOrbit ships dark-first — fall back to `dark` when nothing is stored. */
export function getPreferredTheme(): Theme {
  return getStoredTheme() ?? 'dark';
}

export function persistTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Ignore storage errors (private browsing, quota).
  }
  writeThemeCookie(theme);
}

/** Applies the theme to <html> so CSS (`.dark`) and Toaster stay in sync. */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.dataset.theme = theme;
  // Keep FOUC inline colors in sync with the toggle (see index.html).
  if (theme === 'light') {
    root.style.backgroundColor = '#f4f6fb';
    root.style.color = '#0f172a';
  } else {
    root.style.backgroundColor = '#050816';
    root.style.color = '#f9fafb';
  }
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) {
    themeColor.setAttribute('content', theme === 'light' ? '#f4f6fb' : '#050816');
  }
}
