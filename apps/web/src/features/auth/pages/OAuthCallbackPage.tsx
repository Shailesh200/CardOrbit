import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { setAuthTokens } from '@cardwise/auth';

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
        navigate(await resolvePostAuthPath(), { replace: true });
      } catch {
        navigate('/onboarding', { replace: true });
      }
    })();
  }, [params, navigate]);

  return <p className="px-4 py-16 text-center text-sm text-muted-foreground">{message}</p>;
}
