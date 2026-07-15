import type { AuthTokenPair, ConsumerPrincipal } from '@cardwise/auth';

import { clearAuthTokens, getAccessToken, getRefreshToken, setAuthTokens } from './auth-storage';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export type LoginResponse = AuthTokenPair & { user: ConsumerPrincipal };

function isCredentialAuthPath(path: string): boolean {
  return /\/auth\/(login|signup|register|forgot-password|reset-password|refresh)(\/|$|\?)/.test(
    path,
  );
}

async function parseErrorMessage(response: Response): Promise<string> {
  const text = await response.text();
  if (!text) {
    if (response.status === 500 || response.status === 502 || response.status === 503) {
      return 'API unavailable — ensure the CardOrbit API is running.';
    }
    return `Request failed (${response.status})`;
  }

  try {
    const body = JSON.parse(text) as { message?: unknown };
    if (typeof body.message === 'string') return body.message;
    if (Array.isArray(body.message)) return body.message.join(', ');
  } catch {
    // keep raw text
  }
  return text;
}

async function refreshAccessToken(refreshToken: string): Promise<AuthTokenPair> {
  const response = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  const tokens = (await response.json()) as AuthTokenPair;
  await setAuthTokens(tokens.accessToken, tokens.refreshToken);
  return tokens;
}

/** Authenticated fetch with one refresh retry on 401 (short-lived access tokens). */
export async function extensionAuthFetch<T>(
  path: string,
  init: RequestInit = {},
  retried = false,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Accept', 'application/json');

  const accessToken = await getAccessToken();
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (response.status === 401 && accessToken && !isCredentialAuthPath(path) && !retried) {
    const refreshToken = await getRefreshToken();
    if (refreshToken) {
      try {
        await refreshAccessToken(refreshToken);
        return extensionAuthFetch<T>(path, init, true);
      } catch {
        await clearAuthTokens();
      }
    }
  }

  if (!response.ok) {
    if (response.status === 401 && accessToken && !isCredentialAuthPath(path)) {
      await clearAuthTokens();
    }
    throw new Error(await parseErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function extensionLogin(email: string, password: string): Promise<LoginResponse> {
  const result = await extensionAuthFetch<LoginResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  await setAuthTokens(result.accessToken, result.refreshToken);
  return result;
}

export async function extensionLogout(): Promise<void> {
  const refreshToken = await getRefreshToken();
  if (refreshToken) {
    try {
      await extensionAuthFetch('/api/v1/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // clear local tokens regardless
    }
  }
  await clearAuthTokens();
}

export async function extensionMe(): Promise<ConsumerPrincipal & { fullName: string | null }> {
  return extensionAuthFetch('/api/v1/auth/me', {});
}

export { API_BASE };
