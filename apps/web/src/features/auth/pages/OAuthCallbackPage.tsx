import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { setAuthTokens } from '@cardwise/auth';
import posthog from 'posthog-js';

import { me } from '../../../lib/auth-api';
import { resolvePostAuthPath } from '../../../lib/post-auth-redirect';

export function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('Completing sign-in…');

  useEffect(() => {
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    if (!accessToken || !refreshToken) {
      navigate('/login?error=oauth_failed', { replace: true });
      return;
    }
    setAuthTokens(accessToken, refreshToken);
    void (async () => {
      try {
        setMessage('Checking setup…');
        const [path, userInfo] = await Promise.all([resolvePostAuthPath(), me().catch(() => null)]);
        if (userInfo) {
          posthog.identify(userInfo.id, { email: userInfo.email, role: userInfo.role });
        }
        navigate(path, { replace: true });
      } catch {
        navigate('/onboarding', { replace: true });
      }
    })();
  }, [params, navigate]);

  return <p className="px-4 py-16 text-center text-sm text-muted-foreground">{message}</p>;
}
