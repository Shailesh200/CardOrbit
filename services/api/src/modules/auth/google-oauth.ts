import { signOAuthState, type OAuthIntent } from './oauth-state';

export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
};

export type GoogleProfile = {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
};

export type GoogleTokenExchange = {
  profile: GoogleProfile;
  accessToken: string;
  refreshToken: string | null;
  scopes: string[];
};

export const GMAIL_READONLY_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

export const GOOGLE_OAUTH_SCOPES = ['openid', 'email', 'profile', GMAIL_READONLY_SCOPE].join(' ');

export function getGoogleOAuthConfig(): GoogleOAuthConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return null;
  }
  return {
    clientId,
    clientSecret,
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ||
      `${process.env.API_URL || 'http://localhost:3000'}/api/v1/auth/oauth/callback`,
  };
}

export function getGoogleAuthUrl(
  config: GoogleOAuthConfig,
  options: { intent?: OAuthIntent; userId?: string } = {},
): string {
  const intent = options.intent ?? 'login';
  const state = signOAuthState({ intent, userId: options.userId });
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.callbackUrl,
    response_type: 'code',
    scope: GOOGLE_OAUTH_SCOPES,
    access_type: 'offline',
    // consent ensures refresh_token on first grant; select_account for linking another inbox
    prompt: intent === 'link_mailbox' ? 'select_account consent' : 'consent',
    include_granted_scopes: 'true',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(
  code: string,
  config: GoogleOAuthConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<GoogleTokenExchange> {
  const tokenRes = await fetchImpl('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.callbackUrl,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) {
    throw new Error(`Google token exchange failed (${tokenRes.status})`);
  }
  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    scope?: string;
  };
  if (!tokenJson.access_token) {
    throw new Error('Google token response missing access_token');
  }

  const profileRes = await fetchImpl('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  if (!profileRes.ok) {
    throw new Error(`Google profile fetch failed (${profileRes.status})`);
  }
  const profile = (await profileRes.json()) as GoogleProfile;
  if (!profile.sub || !profile.email) {
    throw new Error('Google profile missing sub/email');
  }

  return {
    profile,
    accessToken: tokenJson.access_token,
    refreshToken: tokenJson.refresh_token ?? null,
    scopes: (tokenJson.scope ?? GOOGLE_OAUTH_SCOPES).split(/\s+/).filter(Boolean),
  };
}

export async function refreshGoogleAccessToken(
  refreshToken: string,
  config: GoogleOAuthConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<{ accessToken: string; expiresIn?: number }> {
  const tokenRes = await fetchImpl('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!tokenRes.ok) {
    throw new Error(`Google token refresh failed (${tokenRes.status})`);
  }
  const tokenJson = (await tokenRes.json()) as { access_token?: string; expires_in?: number };
  if (!tokenJson.access_token) {
    throw new Error('Google refresh response missing access_token');
  }
  return { accessToken: tokenJson.access_token, expiresIn: tokenJson.expires_in };
}
