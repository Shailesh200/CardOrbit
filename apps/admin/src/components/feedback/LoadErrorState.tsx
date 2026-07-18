import type { ReactNode } from 'react';
import { Button, cn } from '@cardwise/ui';
import { AlertTriangle } from 'lucide-react';

type LoadErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  action?: ReactNode;
  className?: string;
};

/** Inline load failure with retry — never reuse EmptyState copy after a failed fetch. */
export function LoadErrorState({
  title = 'Could not load this data',
  description = 'Something went wrong. Check your connection and try again.',
  onRetry,
  action,
  className,
}: LoadErrorStateProps) {
  return (
    <div className={cn('admin-panel admin-error-state', className)} role="alert">
      <AlertTriangle className="admin-error-state__icon" aria-hidden />
      <div className="admin-error-state__copy">
        <p className="admin-error-state__title">{title}</p>
        <p className="admin-error-state__desc">{description}</p>
      </div>
      {onRetry ? (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
      {action}
    </div>
  );
}
