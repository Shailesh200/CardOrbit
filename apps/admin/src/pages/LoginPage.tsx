import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  toast,
} from '@cardwise/ui';

import { getAdminToken, login, setAdminToken } from '../lib/api';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@cardwise.local');
  const [password, setPassword] = useState('cardwise-admin');
  const [busy, setBusy] = useState(false);

  if (getAdminToken()) {
    return <Navigate to="/insights" replace />;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await login(email, password);
      setAdminToken(result.accessToken);
      toast.success(`Signed in as ${result.admin.email}`);
      navigate('/insights');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-login">
      <div className="admin-login__glow" aria-hidden />
      <Card className="admin-login__card glass-panel animate-admin-enter">
        <CardHeader className="admin-login__header">
          <span className="admin-sidebar__mark" aria-hidden>
            C
          </span>
          <CardTitle className="font-display text-2xl tracking-tight">CardOrbit Admin</CardTitle>
          <CardDescription className="text-base">
            Sign in to manage catalog data, sync jobs, and operational insights.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="admin-form-grid admin-login__form" onSubmit={onSubmit}>
            <label className="admin-field">
              <span className="text-sm font-medium">Email</span>
              <Input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label className="admin-field">
              <span className="text-sm font-medium">Password</span>
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <div className="admin-form-actions">
              <Button type="submit" className="btn-premium w-full" disabled={busy}>
                {busy ? 'Signing in…' : 'Sign in'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
