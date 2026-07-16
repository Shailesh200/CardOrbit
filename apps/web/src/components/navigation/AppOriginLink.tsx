import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { appHref, isBrowserOnLandingHost } from '../../lib/site-origins';

type AppOriginLinkProps = {
  to: string;
  className?: string;
  children: ReactNode;
};

/**
 * Link to an app-subdomain route. On cardorbit.in uses an absolute href so
 * signup/login leave the landing host; on app/localhost uses React Router.
 */
export function AppOriginLink({ to, children, className }: AppOriginLinkProps) {
  if (isBrowserOnLandingHost()) {
    return (
      <a href={appHref(to)} className={className}>
        {children}
      </a>
    );
  }

  return (
    <Link to={to} className={className}>
      {children}
    </Link>
  );
}
