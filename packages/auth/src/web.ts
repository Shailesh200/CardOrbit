const ACCESS_KEY = 'cardwise.consumer.accessToken';
const REFRESH_KEY = 'cardwise.consumer.refreshToken';

export const AUTH_SESSION_CHANGED = 'cardwise:auth-session-changed';
export const AUTH_UNAUTHORIZED = 'cardwise:auth-unauthorized';

export type AuthUnauthorizedDetail = {
  message: string;
};

export type AuthHttpErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'SERVER'
  | 'NETWORK'
  | 'UNKNOWN';

export class AuthHttpError extends Error {
  readonly status: number;
  readonly code: AuthHttpErrorCode;
  /** When true, UI must not toast — session redirect owns the message. */
  readonly silentToast: boolean;

  constructor(
    message: string,
    options: { status: number; code: AuthHttpErrorCode; silentToast?: boolean },
  ) {
    super(message);
    this.name = 'AuthHttpError';
    this.status = options.status;
    this.code = options.code;
    this.silentToast = options.silentToast ?? false;
  }
}

export function isAuthHttpError(error: unknown): error is AuthHttpError {
  return error instanceof AuthHttpError;
}

export function isSilentAuthError(error: unknown): boolean {
  return isAuthHttpError(error) && error.silentToast;
}

function notifyAuthSessionChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_SESSION_CHANGED));
  }
}

export function getAccessToken(): string | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  return localStorage.getItem(REFRESH_KEY);
}

export function setAuthTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
  notifyAuthSessionChanged();
}

export function clearAuthTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  notifyAuthSessionChanged();
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken());
}

function isCredentialAuthPath(path: string): boolean {
  return /\/auth\/(login|signup|register|forgot-password|reset-password)(\/|$|\?)/.test(path);
}

function sessionExpiredMessage(apiMessage: string): string {
  const lower = apiMessage.toLowerCase();
  if (lower.includes('not active')) {
    return 'Your account is not active. Please sign in again or contact support.';
  }
  if (lower.includes('not verified')) {
    return 'Please verify your email before continuing.';
  }
  return 'Your session has expired. Please sign in again.';
}

function codeForStatus(status: number): AuthHttpErrorCode {
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 400 || status === 422) return 'VALIDATION';
  if (status >= 500) return 'SERVER';
  return 'UNKNOWN';
}

export async function authFetch<T>(path: string, init: RequestInit = {}, apiBase = ''): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${apiBase}${path}`, { ...init, headers });
  } catch {
    throw new AuthHttpError('Network error — check your connection and try again.', {
      status: 0,
      code: 'NETWORK',
    });
  }

  if (!response.ok) {
    const text = await response.text();
    let message = text || `Request failed (${response.status})`;

    if (!text && (response.status === 500 || response.status === 502 || response.status === 503)) {
      message = 'API unavailable — ensure the CardWise API is running (bun run dev:api).';
    }

    try {
      const body = JSON.parse(text) as { message?: unknown; statusCode?: number };
      if (typeof body.message === 'string') {
        message = body.message;
      } else if (Array.isArray(body.message)) {
        message = body.message.join(', ');
      } else if (
        body.message &&
        typeof body.message === 'object' &&
        'message' in body.message &&
        typeof (body.message as { message?: unknown }).message === 'string'
      ) {
        message = (body.message as { message: string }).message;
      }
    } catch {
      // keep raw text or fallback above
    }

    const sessionExpiry = response.status === 401 && Boolean(token) && !isCredentialAuthPath(path);
    if (sessionExpiry) {
      clearAuthTokens();
      const friendly = sessionExpiredMessage(message);
      const detail: AuthUnauthorizedDetail = { message: friendly };
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED, { detail }));
      }
      throw new AuthHttpError(friendly, {
        status: 401,
        code: 'UNAUTHORIZED',
        silentToast: true,
      });
    }

    throw new AuthHttpError(message, {
      status: response.status,
      code: codeForStatus(response.status),
    });
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}
