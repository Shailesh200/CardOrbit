import type { AuthTokenPair } from '@cardwise/auth';

const ACCESS_KEY = 'cardwise.consumer.accessToken';
const REFRESH_KEY = 'cardwise.consumer.refreshToken';

export type StoredAuthTokens = Pick<AuthTokenPair, 'accessToken' | 'refreshToken'>;

export async function getAccessToken(): Promise<string | null> {
  const result = await chrome.storage.local.get(ACCESS_KEY);
  const token = result[ACCESS_KEY];
  return typeof token === 'string' && token.length > 0 ? token : null;
}

export async function getRefreshToken(): Promise<string | null> {
  const result = await chrome.storage.local.get(REFRESH_KEY);
  const token = result[REFRESH_KEY];
  return typeof token === 'string' && token.length > 0 ? token : null;
}

export async function setAuthTokens(accessToken: string, refreshToken: string): Promise<void> {
  await chrome.storage.local.set({
    [ACCESS_KEY]: accessToken,
    [REFRESH_KEY]: refreshToken,
  });
}

export async function clearAuthTokens(): Promise<void> {
  await chrome.storage.local.remove([ACCESS_KEY, REFRESH_KEY]);
}

export async function isAuthenticated(): Promise<boolean> {
  return Boolean(await getAccessToken());
}

export async function readAuthTokens(): Promise<StoredAuthTokens | null> {
  const accessToken = await getAccessToken();
  const refreshToken = await getRefreshToken();
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}
