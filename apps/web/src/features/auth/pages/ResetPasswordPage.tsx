import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Button, Label } from '@cardwise/ui';

import { PasswordInput } from '@/components/auth/PasswordInput';
import { AuthPanel } from '../../../components/layout/AuthPanel';
import { resetPassword } from '../../../lib/auth-api';
import { toast } from '../../../lib/app-toast';
import { consumerLink } from '../../../lib/consumer-link';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await resetPassword(token, password);
      toast.success('Password updated');
      navigate('/login');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Reset failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthPanel
      title="Reset password"
      description="Choose a new strong password."
      footer={
        <p className="text-center text-sm text-muted-foreground">
          <Link className={consumerLink} to="/login">
            Back to sign in
          </Link>
        </p>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
        <div className="consumer-field">
          <Label htmlFor="reset-password">New password</Label>
          <PasswordInput
            id="reset-password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={busy || !token} className="btn-premium w-full">
          {busy ? 'Updating…' : 'Update password'}
        </Button>
        {!token ? (
          <p className="text-sm text-destructive">Reset link is invalid or expired.</p>
        ) : null}
      </form>
    </AuthPanel>
  );
}
