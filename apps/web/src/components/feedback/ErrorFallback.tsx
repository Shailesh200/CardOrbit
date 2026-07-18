import { Link } from 'react-router';
import { Button } from '@cardwise/ui';
import { AlertTriangle } from 'lucide-react';

import { HeroLogo } from '@brand/HeroLogo';
import { consumerLink } from '@lib/consumer-link';

type ErrorFallbackProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
  showHome?: boolean;
};

/** Branded error state — used by ErrorBoundary and route-level failures. */
export function ErrorFallback({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. You can try again or return home.',
  onRetry,
  showHome = true,
}: ErrorFallbackProps) {
  return (
    <div className="consumer-page flex min-h-[50vh] items-center justify-center px-4 py-16">
      <div className="consumer-surface consumer-surface--glass w-full max-w-md space-y-6 p-8 text-center">
        <HeroLogo size="sm" tone="light" linked={false} className="mx-auto" />
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="size-7" aria-hidden />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">{message}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          {onRetry ? (
            <Button type="button" className="btn-premium" onClick={onRetry}>
              Try again
            </Button>
          ) : null}
          {showHome ? (
            <Button asChild variant="outline">
              <Link to="/account">Go to home</Link>
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          Need help?{' '}
          <Link className={consumerLink} to="/privacy">
            Contact & privacy
          </Link>
        </p>
      </div>
    </div>
  );
}
