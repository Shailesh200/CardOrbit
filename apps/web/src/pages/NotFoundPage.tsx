import { Link } from 'react-router';
import { Button } from '@cardwise/ui';

import { HeroLogo } from '@brand/HeroLogo';
import { DASHBOARD_PATH } from '../features/dashboard/dashboard-path';
import { useAuthSession } from '../hooks/useAuthSession';

export function NotFoundPage() {
  const authed = useAuthSession();
  const homeTo = authed ? DASHBOARD_PATH : '/';

  return (
    <div className="consumer-page flex min-h-[50vh] items-center justify-center px-4 py-16">
      <div className="consumer-surface consumer-surface--glass w-full max-w-md space-y-6 p-8 text-center">
        <HeroLogo size="sm" tone="light" linked={false} className="mx-auto" />
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">404</p>
          <h1 className="font-display text-xl font-semibold tracking-tight">Page not found</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            That link does not match any page in CardOrbit. Head back and try another path.
          </p>
        </div>
        <Button asChild className="btn-premium">
          <Link to={homeTo}>{authed ? 'Go to home' : 'Go to CardOrbit'}</Link>
        </Button>
      </div>
    </div>
  );
}
