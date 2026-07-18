import { FormEvent, useState } from 'react';
import { Link } from 'react-router';
import { Mail } from 'lucide-react';
import { Button, Input, Label, Separator } from '@cardwise/ui';

import { PasswordInput } from '@/components/auth/PasswordInput';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { AuthPanel } from '@layout/AuthPanel';
import { resendVerification, signup } from '@lib/auth-api';
import { notify, toast } from '@lib/app-toast';
import { consumerLink } from '@lib/consumer-link';
import { fieldDescribedBy } from '@lib/field-error';

export function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resendBusy, setResendBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirmPassword) {
      notify.error('Passwords do not match');
      return;
    }
    setBusy(true);
    try {
      await signup({ email, password, firstName, lastName });
      setPendingEmail(email.trim());
    } catch (error) {
      notify.fromError(error, 'Signup failed');
    } finally {
      setBusy(false);
    }
  }

  async function onResend() {
    if (!pendingEmail) return;
    setResendBusy(true);
    try {
      await resendVerification(pendingEmail);
      toast.success('Verification email sent again');
    } catch (error) {
      notify.fromError(error, 'Could not resend email');
    } finally {
      setResendBusy(false);
    }
  }

  if (pendingEmail) {
    return (
      <AuthPanel
        title="Check your email"
        description="We need to confirm your address before you can sign in."
        footer={
          <p className="text-center text-sm text-muted-foreground">
            Wrong address?{' '}
            <button type="button" className={consumerLink} onClick={() => setPendingEmail(null)}>
              Start over
            </button>
          </p>
        }
      >
        <div className="signup-verify-prompt">
          <div className="signup-verify-prompt__icon" aria-hidden>
            <Mail className="size-8" strokeWidth={1.75} />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">We sent a verification link to</p>
            <p className="signup-verify-prompt__email">{pendingEmail}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Open the link in that message to activate your account. If you do not see it within a
              few minutes, check your spam folder.
            </p>
          </div>
          <div className="signup-verify-prompt__actions">
            <Button asChild className="btn-premium w-full">
              <Link to="/login">Go to sign in</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={resendBusy}
              onClick={() => void onResend()}
            >
              {resendBusy ? 'Sending…' : 'Resend verification email'}
            </Button>
          </div>
        </div>
      </AuthPanel>
    );
  }

  return (
    <AuthPanel
      title="Create account"
      description="Password must be 12+ chars with upper, lower, number, symbol."
      footer={
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link className={consumerLink} to="/login">
            Sign in
          </Link>
        </p>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="consumer-field">
            <Label htmlFor="signup-first">First name</Label>
            <Input
              id="signup-first"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="consumer-field">
            <Label htmlFor="signup-last">Last name</Label>
            <Input
              id="signup-last"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>
        <div className="consumer-field">
          <Label htmlFor="signup-email">Email</Label>
          <Input
            id="signup-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="consumer-field">
          <Label htmlFor="signup-password">Password</Label>
          <PasswordInput
            id="signup-password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="consumer-field">
          <Label htmlFor="signup-confirm-password">Confirm password</Label>
          <PasswordInput
            id="signup-confirm-password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            aria-invalid={confirmPassword.length > 0 && password !== confirmPassword}
            aria-describedby={fieldDescribedBy(
              'signup-confirm-password',
              confirmPassword.length > 0 && password !== confirmPassword
                ? 'Passwords do not match'
                : null,
            )}
          />
          {confirmPassword.length > 0 && password !== confirmPassword ? (
            <p id="signup-confirm-password-error" className="text-sm text-destructive">
              Passwords do not match
            </p>
          ) : null}
        </div>
        <Button type="submit" disabled={busy} className="btn-premium w-full">
          {busy ? 'Creating…' : 'Create account'}
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
