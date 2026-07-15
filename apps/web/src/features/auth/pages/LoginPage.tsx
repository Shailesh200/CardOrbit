import { FormEvent, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Button, Input, Label, Separator } from '@cardwise/ui';

import { PasswordInput } from '@/components/auth/PasswordInput';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { AuthPanel } from '@layout/AuthPanel';
import { login } from '@lib/auth-api';
import { toast } from '@lib/app-toast';
import { consumerLink, consumerLinkSm } from '@lib/consumer-link';
import { resolvePostAuthPath } from '@lib/post-auth-redirect';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const authMessage = (location.state as { authMessage?: string } | null)?.authMessage;
    if (!authMessage) return;
    toast.error(authMessage);
    navigate('/login', { replace: true, state: {} });
  }, [location.state, navigate]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      toast.success('Signed in');
      navigate(await resolvePostAuthPath());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthPanel
      title="Sign in"
      description="Access your CardOrbit account."
      footer={
        <p className="text-center text-sm text-muted-foreground">
          New here?{' '}
          <Link className={consumerLink} to="/signup">
            Create an account
          </Link>
        </p>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
        <div className="consumer-field">
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="consumer-field">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="login-password">Password</Label>
            <Link className={consumerLinkSm} to="/forgot-password">
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="login-password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={busy} className="btn-premium mt-1 w-full">
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>

      <GoogleSignInButton />
    </AuthPanel>
  );
}
