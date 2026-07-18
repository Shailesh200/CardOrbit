import { renderEmailLayout } from './email-layout';

export type VerificationEmailInput = {
  verifyUrl: string;
};

export function renderVerificationEmailText({ verifyUrl }: VerificationEmailInput): string {
  return `Welcome to CardOrbit.

Confirm your email to finish creating your account:

${verifyUrl}

This link expires in 24 hours. If you did not sign up for CardOrbit, you can ignore this message.

— The CardOrbit team`;
}

export function renderVerificationEmailHtml({ verifyUrl }: VerificationEmailInput): string {
  return renderEmailLayout({
    title: 'Verify your CardOrbit email',
    preheader: 'Confirm your email to finish creating your CardOrbit account.',
    heading: 'Verify your email',
    bodyHtml: `
      <p style="margin:0 0 14px;">Welcome to <strong style="color:#ffffff;font-weight:600;">CardOrbit</strong>.</p>
      <p style="margin:0;">Confirm this address to activate your account and start picking the best card for every purchase.</p>
    `,
    ctaLabel: 'Verify email',
    ctaUrl: verifyUrl,
    footerNote:
      'This link expires in 24 hours. If you did not create a CardOrbit account, you can safely ignore this email.',
  });
}

export type PasswordResetEmailInput = {
  resetUrl: string;
};

export function renderPasswordResetEmailText({ resetUrl }: PasswordResetEmailInput): string {
  return `Reset your CardOrbit password:

${resetUrl}

This link expires in 1 hour. If you did not request a reset, ignore this message.

— The CardOrbit team`;
}

export function renderPasswordResetEmailHtml({ resetUrl }: PasswordResetEmailInput): string {
  return renderEmailLayout({
    title: 'Reset your CardOrbit password',
    preheader: 'Use this secure link to choose a new CardOrbit password.',
    heading: 'Reset your password',
    bodyHtml: `
      <p style="margin:0 0 14px;">We received a request to reset the password for your CardOrbit account.</p>
      <p style="margin:0;">Choose a new password with the button below. If you did not request this, no action is needed.</p>
    `,
    ctaLabel: 'Reset password',
    ctaUrl: resetUrl,
    footerNote:
      'This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.',
  });
}
