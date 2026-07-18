import { escapeHtml, renderEmailLayout } from './email-layout';

export type WelcomeEmailInput = {
  firstName: string | null;
  appUrl: string;
};

export function renderWelcomeEmailText({ firstName, appUrl }: WelcomeEmailInput): string {
  const greeting = firstName ? `Hi ${firstName},` : 'Hi there,';
  return `${greeting}

Welcome to CardOrbit — we'll help you pick the best credit card for every purchase in India.

Get started:
- Add your cards to your portfolio: ${appUrl}/account/cards
- Search a merchant for a live recommendation: ${appUrl}/account/merchants

You can manage notification preferences anytime in Settings.

— The CardOrbit team`;
}

export function renderWelcomeEmailHtml({ firstName, appUrl }: WelcomeEmailInput): string {
  const greeting = escapeHtml(firstName ? `Hi ${firstName},` : 'Hi there,');
  const cardsUrl = `${appUrl}/account/cards`;

  return renderEmailLayout({
    title: 'Welcome to CardOrbit',
    preheader: 'Your account is ready — add your cards and get smarter recommendations.',
    heading: 'Welcome aboard',
    bodyHtml: `
      <p style="margin:0 0 14px;">${greeting}</p>
      <p style="margin:0;">Your account is ready. CardOrbit helps you choose the best credit card for every purchase in India.</p>
    `,
    ctaLabel: 'Add your cards',
    ctaUrl: cardsUrl,
    footerNote: `Manage email preferences anytime in Settings · ${appUrl}/account/settings`,
  });
}
