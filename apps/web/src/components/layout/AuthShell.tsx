import { Outlet, useLocation } from 'react-router';

import { AuthRail } from '@layout/AuthRail';

/**
 * Auth route layout — left rail persists; only the right panel re-renders
 * when toggling login ↔ signup (or other auth flows).
 */
export function AuthShell() {
  const { pathname } = useLocation();

  return (
    <div className="consumer-page mx-auto grid min-h-[calc(100dvh-var(--shell-header-height)-var(--safe-top)-var(--safe-bottom)-2rem)] max-w-5xl gap-6 py-6 sm:gap-8 sm:py-8 lg:grid-cols-2 lg:items-start lg:py-10">
      <AuthRail />
      <div className="auth-panel-column mx-auto flex w-full min-w-0 max-w-md flex-col justify-center">
        <div key={pathname} className="auth-panel-view flex min-w-0 flex-col space-y-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
