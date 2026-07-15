import { Navigate, Outlet, useLocation } from 'react-router';

import { getAdminToken } from '../lib/api';

export function RequireAuth() {
  const location = useLocation();
  if (!getAdminToken()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
