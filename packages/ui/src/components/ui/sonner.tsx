'use client';

import * as React from 'react';
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

const toastThemeVars = {
  '--normal-bg': 'var(--popover)',
  '--normal-text': 'var(--popover-foreground)',
  '--normal-border': 'var(--border)',
  '--border-radius': 'var(--radius)',
  '--success-bg': 'oklch(0.96 0.04 155)',
  '--success-text': 'oklch(0.32 0.1 160)',
  '--success-border': 'oklch(0.82 0.06 155)',
  '--error-bg': 'oklch(0.97 0.03 25)',
  '--error-text': 'oklch(0.42 0.16 25)',
  '--error-border': 'oklch(0.86 0.06 25)',
  '--warning-bg': 'oklch(0.97 0.04 85)',
  '--warning-text': 'oklch(0.45 0.12 75)',
  '--warning-border': 'oklch(0.88 0.08 85)',
  '--info-bg': 'oklch(0.96 0.03 230)',
  '--info-text': 'oklch(0.38 0.1 240)',
  '--info-border': 'oklch(0.84 0.05 230)',
} as React.CSSProperties;

const Toaster = ({ theme = 'light', ...props }: ToasterProps) => {
  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: 'cw-toast',
          title: 'cw-toast__title',
          description: 'cw-toast__description',
          success: 'cw-toast--success',
          error: 'cw-toast--error',
          warning: 'cw-toast--warning',
          info: 'cw-toast--info',
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={toastThemeVars}
      {...props}
    />
  );
};

export { Toaster };
