import type { ReactNode } from 'react';

import { HeroLogo } from '@brand/HeroLogo';

type AuthPanelProps = {
  title: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
};

/** Right-hand auth panel chrome — title, surface, footer. Form content swaps per route. */
export function AuthPanel({ title, description, footer, children }: AuthPanelProps) {
  return (
    <>
      <div className="lg:hidden">
        <HeroLogo size="sm" tone="light" />
      </div>
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Account</p>
        <h2 className="font-display text-[1.75rem] font-semibold tracking-tight">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="consumer-surface consumer-surface-accent consumer-surface--glass p-6">
        {children}
      </div>
      {footer}
    </>
  );
}
