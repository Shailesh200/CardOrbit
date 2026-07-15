import { Outlet, useLocation } from 'react-router';

import { AuthRail } from '@layout/AuthRail';

/**
 * Auth route layout — left rail persists; only the right panel re-renders
 * when toggling login ↔ signup (or other auth flows).
 */
export function AuthShell() {
  const { pathname } = useLocation();

  return (
    <div className="consumer-page mx-auto grid min-h-[calc(100vh-8rem)] max-w-5xl gap-8 py-8 lg:grid-cols-2 lg:items-start lg:py-10">
      <AuthRail />
      <div className="auth-panel-column mx-auto flex w-full max-w-md flex-col justify-center">
        <div key={pathname} className="auth-panel-view flex flex-col space-y-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
