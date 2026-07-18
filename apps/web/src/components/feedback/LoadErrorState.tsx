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

/** Inline load failure — never use EmptyState copy after a failed fetch. */
export function LoadErrorState({
  title = 'Could not load this page',
  description = 'Something went wrong. Check your connection and try again.',
  onRetry,
  action,
  className,
}: LoadErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-4 rounded-2xl border border-destructive/25 bg-card/60 px-6 py-12 text-center',
        className,
      )}
      role="alert"
    >
      <AlertTriangle className="size-10 text-destructive/80" aria-hidden />
      <div className="space-y-1">
        <p className="font-display text-lg font-semibold tracking-tight">{title}</p>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {onRetry ? (
        <Button type="button" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
      {action}
    </div>
  );
}
