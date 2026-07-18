import { useCallback, useEffect, useState } from 'react';

import { applyTheme, getPreferredTheme, persistTheme, type Theme } from '../lib/theme';

/** Consumer shell light/dark toggle — persisted to localStorage, applied to <html>. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => getPreferredTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === 'dark' ? 'light' : 'dark';
      persistTheme(next);
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
