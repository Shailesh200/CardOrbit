/** Shared HTML shell for transactional CardOrbit emails (inline CSS for clients). */

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export type EmailLayoutInput = {
  title: string;
  preheader: string;
  heading: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  footerNote: string;
};

export function renderEmailLayout(input: EmailLayoutInput): string {
  const title = escapeHtml(input.title);
  const preheader = escapeHtml(input.preheader);
  const heading = escapeHtml(input.heading);
  const ctaLabel = escapeHtml(input.ctaLabel);
  const ctaUrl = escapeHtml(input.ctaUrl);
  const footerNote = escapeHtml(input.footerNote);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark" />
    <meta name="supported-color-schemes" content="dark" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#050816;font-family:Georgia,'Times New Roman',serif;color:#e8edf5;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${preheader}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#050816;background-image:radial-gradient(ellipse 80% 50% at 50% -10%,rgba(79,140,255,0.22),transparent 55%);padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
            <tr>
              <td style="padding:0 8px 28px;text-align:center;">
                <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:#8eb6ff;">
                  CardOrbit
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#0b1220;border:1px solid rgba(142,182,255,0.16);border-radius:20px;overflow:hidden;box-shadow:0 24px 48px rgba(0,0,0,0.35);">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="height:4px;background:linear-gradient(90deg,#4f8cff 0%,#7c5cff 100%);font-size:0;line-height:0;">&nbsp;</td>
                  </tr>
                  <tr>
                    <td style="padding:36px 32px 12px;">
                      <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1.2;font-weight:400;letter-spacing:-0.02em;color:#ffffff;">
                        ${heading}
                      </h1>
                      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:16px;line-height:1.65;color:#b7c3d6;">
                        ${input.bodyHtml}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 32px 32px;" align="left">
                      <a href="${ctaUrl}" style="display:inline-block;background:#4f8cff;color:#050816;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-weight:700;font-size:15px;letter-spacing:0.01em;padding:14px 28px;border-radius:12px;">
                        ${ctaLabel}
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 32px 28px;">
                      <p style="margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;line-height:1.5;color:#7a879c;">
                        Button not working? Paste this link into your browser:
                      </p>
                      <p style="margin:0;word-break:break-all;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.5;">
                        <a href="${ctaUrl}" style="color:#8eb6ff;text-decoration:underline;">${ctaUrl}</a>
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:20px 32px;border-top:1px solid rgba(142,182,255,0.12);background:#080e1a;">
                      <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;line-height:1.55;color:#6d7a90;">
                        ${footerNote}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 8px 0;text-align:center;">
                <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;line-height:1.5;color:#5c6a80;">
                  CardOrbit · Best card for every spend in India
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
