/** Consumer shell light/dark theme — persisted client preference. */
export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'cardwise.theme';

function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark';
}

export function getStoredTheme(): Theme | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return isTheme(raw) ? raw : null;
  } catch {
    return null;
  }
}

/** CardOrbit ships dark-first — fall back to `dark` when nothing is stored. */
export function getPreferredTheme(): Theme {
  return getStoredTheme() ?? 'dark';
}

export function persistTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Ignore storage errors (private browsing, quota).
  }
}

/** Applies the theme to <html> so CSS (`.dark`) and Toaster stay in sync. */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.dataset.theme = theme;
}
