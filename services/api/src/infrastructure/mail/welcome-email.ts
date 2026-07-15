export type WelcomeEmailInput = {
  firstName: string | null;
  appUrl: string;
};

export function renderWelcomeEmailText({ firstName, appUrl }: WelcomeEmailInput): string {
  const greeting = firstName ? `Hi ${firstName},` : 'Hi there,';
  return `${greeting}

Welcome to CardWise — we'll help you pick the best credit card for every purchase in India.

Get started:
- Add your cards to your portfolio: ${appUrl}/account/cards
- Search a merchant for a live recommendation: ${appUrl}/account/merchants

You can manage notification preferences anytime in Settings.

— The CardWise team`;
}

export function renderWelcomeEmailHtml({ firstName, appUrl }: WelcomeEmailInput): string {
  const greeting = firstName ? `Hi ${firstName},` : 'Hi there,';
  const cardsUrl = `${appUrl}/account/cards`;
  const merchantsUrl = `${appUrl}/account/merchants`;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Welcome to CardWise</title>
  </head>
  <body style="margin:0;padding:0;background:#0f1419;font-family:'Segoe UI',system-ui,sans-serif;color:#e8edf2;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f1419;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#151c24;border:1px solid #243040;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:32px 28px 8px;">
                <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#7dd3fc;">CardWise</p>
                <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;color:#ffffff;">Welcome aboard</h1>
                <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#c5d0db;">${greeting}</p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#c5d0db;">
                  Your account is ready. CardWise helps you choose the best credit card for every purchase in India.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 28px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding-bottom:12px;">
                      <a href="${cardsUrl}" style="display:inline-block;background:#38bdf8;color:#0f1419;text-decoration:none;font-weight:600;font-size:15px;padding:12px 20px;border-radius:10px;">Add your cards</a>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <a href="${merchantsUrl}" style="display:inline-block;color:#7dd3fc;text-decoration:none;font-size:15px;">Search a merchant →</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px;border-top:1px solid #243040;background:#111820;">
                <p style="margin:0;font-size:13px;line-height:1.5;color:#8b9aab;">
                  Manage email preferences in <a href="${appUrl}/account/settings" style="color:#7dd3fc;">Settings</a>.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
