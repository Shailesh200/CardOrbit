import {
  authFetch,
  clearAuthTokens,
  getRefreshToken,
  setAuthTokens,
  type AuthTokenPair,
  type ConsumerPrincipal,
} from '@cardwise/auth';

const API_BASE = import.meta.env.VITE_API_URL || '';

export type LoginResponse = AuthTokenPair & { user: ConsumerPrincipal };

export async function signup(body: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}) {
  return authFetch<{ userId: string; verificationRequired: true }>(
    '/api/v1/auth/signup',
    { method: 'POST', body: JSON.stringify(body) },
    API_BASE,
  );
}

export async function login(email: string, password: string) {
  const result = await authFetch<LoginResponse>(
    '/api/v1/auth/login',
    { method: 'POST', body: JSON.stringify({ email, password }) },
    API_BASE,
  );
  setAuthTokens(result.accessToken, result.refreshToken);
  return result;
}

export async function logout() {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    try {
      await authFetch(
        '/api/v1/auth/logout',
        { method: 'POST', body: JSON.stringify({ refreshToken }) },
        API_BASE,
      );
    } catch {
      // clear local tokens regardless
    }
  }
  clearAuthTokens();
}

export async function me() {
  return authFetch<ConsumerPrincipal & { fullName: string | null }>(
    '/api/v1/auth/me',
    {},
    API_BASE,
  );
}

export async function verifyEmail(verificationToken: string) {
  return authFetch<{ verified: true }>(
    '/api/v1/auth/verify-email',
    { method: 'POST', body: JSON.stringify({ verificationToken }) },
    API_BASE,
  );
}

export async function forgotPassword(email: string) {
  return authFetch<{ ok: true }>(
    '/api/v1/auth/forgot-password',
    { method: 'POST', body: JSON.stringify({ email }) },
    API_BASE,
  );
}

export async function resendVerification(email: string) {
  return authFetch<{ ok: true }>(
    '/api/v1/auth/resend-verification',
    { method: 'POST', body: JSON.stringify({ email }) },
    API_BASE,
  );
}

export async function resetPassword(token: string, password: string) {
  return authFetch<{ ok: true }>(
    '/api/v1/auth/reset-password',
    { method: 'POST', body: JSON.stringify({ token, password }) },
    API_BASE,
  );
}

export function googleOAuthUrl(): string {
  return `${API_BASE}/api/v1/auth/oauth/google`;
}

export { setAuthTokens, clearAuthTokens, isAuthenticated } from '@cardwise/auth';
