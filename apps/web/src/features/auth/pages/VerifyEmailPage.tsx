import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Button } from '@cardwise/ui';

import { AuthPanel } from '../../../components/layout/AuthPanel';
import { SuccessLottie } from '../../../components/motion/SuccessLottie';
import { verifyEmail } from '../../../lib/auth-api';
import { consumerLink } from '../../../lib/consumer-link';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [status, setStatus] = useState<'pending' | 'ok' | 'error'>('pending');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    void verifyEmail(token)
      .then(() => setStatus('ok'))
      .catch(() => setStatus('error'));
  }, [token]);

  const description =
    status === 'pending'
      ? 'Verifying your email address…'
      : status === 'ok'
        ? 'Your email is verified. You can sign in now.'
        : 'Verification failed or the link is missing or expired.';

  return (
    <AuthPanel
      title="Email verification"
      description={description}
      footer={
        <p className="text-center text-sm text-muted-foreground">
          <Link className={consumerLink} to="/login">
            Go to sign in
          </Link>
        </p>
      }
    >
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        {status === 'pending' ? (
          <div className="size-10 animate-pulse rounded-full bg-primary/15" aria-hidden />
        ) : status === 'ok' ? (
          <SuccessLottie className="size-20" />
        ) : (
          <div
            className="flex size-16 items-center justify-center rounded-full bg-destructive/10 text-2xl text-destructive"
            aria-hidden
          >
            !
          </div>
        )}
        {status === 'ok' ? (
          <Button asChild className="w-full">
            <Link to="/login">Continue to sign in</Link>
          </Button>
        ) : null}
      </div>
    </AuthPanel>
  );
}
