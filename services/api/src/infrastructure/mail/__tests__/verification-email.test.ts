import { describe, expect, it } from 'vitest';

import { renderEmailLayout } from '../email-layout';
import {
  renderPasswordResetEmailHtml,
  renderVerificationEmailHtml,
  renderVerificationEmailText,
} from '../verification-email';

describe('verification email templates', () => {
  it('renders text and html verification content', () => {
    const verifyUrl = 'https://app.cardorbit.in/verify-email?token=abc123';
    const text = renderVerificationEmailText({ verifyUrl });
    const html = renderVerificationEmailHtml({ verifyUrl });

    expect(text).toContain(verifyUrl);
    expect(text).toContain('24 hours');
    expect(html).toContain('Verify email');
    expect(html).toContain(verifyUrl);
    expect(html).toContain('CardOrbit');
  });

  it('escapes urls in the shared layout', () => {
    const html = renderEmailLayout({
      title: 't',
      preheader: 'p',
      heading: 'h',
      bodyHtml: '<p>ok</p>',
      ctaLabel: 'Go',
      ctaUrl: 'https://example.com/?a=1&b=2',
      footerNote: 'note',
    });
    expect(html).toContain('https://example.com/?a=1&amp;b=2');
  });

  it('renders password reset html', () => {
    const html = renderPasswordResetEmailHtml({
      resetUrl: 'https://app.cardorbit.in/reset-password?token=xyz',
    });
    expect(html).toContain('Reset password');
    expect(html).toContain('1 hour');
  });
});
