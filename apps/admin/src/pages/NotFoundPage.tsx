import { Link } from 'react-router';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@cardwise/ui';

import { getAdminToken } from '../lib/api';

/** Branded 404 — never silently redirect unknown admin routes. */
export function NotFoundPage() {
  const authed = Boolean(getAdminToken());

  return (
    <div className="admin-login">
      <div className="admin-login__glow" aria-hidden />
      <Card className="admin-login__card glass-panel animate-admin-enter">
        <CardHeader className="admin-login__header">
          <span className="admin-sidebar__mark" aria-hidden>
            C
          </span>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">404</p>
          <CardTitle className="font-display text-2xl tracking-tight">Page not found</CardTitle>
          <CardDescription className="text-base">
            This admin route doesn&apos;t exist or may have moved. Check the URL, or use navigation
            to get back on track.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="btn-premium w-full">
            <Link to={authed ? '/insights' : '/login'}>
              {authed ? 'Back to Insights' : 'Back to sign in'}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
