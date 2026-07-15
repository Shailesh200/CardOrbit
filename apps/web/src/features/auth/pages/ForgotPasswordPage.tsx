import { FormEvent, useState } from 'react';
import { Link } from 'react-router';
import { Button, Input, Label } from '@cardwise/ui';

import { AuthPanel } from '../../../components/layout/AuthPanel';
import { forgotPassword } from '../../../lib/auth-api';
import { toast } from '../../../lib/app-toast';
import { consumerLink } from '../../../lib/consumer-link';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await forgotPassword(email);
      toast.info('If that email exists, a reset link was sent');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthPanel
      title="Forgot password"
      description="We will email a reset link if the account exists."
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
          <Label htmlFor="forgot-email">Email</Label>
          <Input
            id="forgot-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={busy} className="btn-premium w-full">
          {busy ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
    </AuthPanel>
  );
}
