import { Moon, Sun } from 'lucide-react';
import { Button } from '@cardwise/ui';

import type { Theme } from '../lib/theme';

type ThemeToggleProps = {
  theme: Theme;
  onToggle: () => void;
};

/** Light/dark toggle for the consumer shell header (M-PWA). */
export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isDark = theme === 'dark';

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={onToggle}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {isDark ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
    </Button>
  );
}
