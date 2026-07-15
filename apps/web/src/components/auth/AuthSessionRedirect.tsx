import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { AUTH_UNAUTHORIZED, type AuthUnauthorizedDetail } from '@cardwise/auth';

/**
 * Root-level handler: any authenticated API 401 clears the session and
 * redirects to login with a user-facing message.
 */
export function AuthSessionRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<AuthUnauthorizedDetail>).detail;
      const message = detail?.message ?? 'Your session has expired. Please sign in again.';
      const path = window.location.pathname;
      if (path === '/login' || path === '/signup') {
        return;
      }
      navigate('/login', { replace: true, state: { authMessage: message } });
    };

    window.addEventListener(AUTH_UNAUTHORIZED, handler);
    return () => window.removeEventListener(AUTH_UNAUTHORIZED, handler);
  }, [navigate]);

  return null;
}
