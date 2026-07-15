import type { ReactNode } from 'react';
import { cn } from '@cardwise/ui';

type ConsumerDarkPanelProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

/** Dark ambient surface — matches home hero / CRED-style panels. */
export function ConsumerDarkPanel({
  children,
  className,
  contentClassName,
}: ConsumerDarkPanelProps) {
  return (
    <div className={cn('consumer-dark-panel', className)}>
      <div className="consumer-dark-panel__ambient" aria-hidden />
      <div className="consumer-dark-panel__grain" aria-hidden />
      <div className={cn('consumer-dark-panel__content', contentClassName)}>{children}</div>
    </div>
  );
}
