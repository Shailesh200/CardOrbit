import * as Sentry from '@sentry/react';

const SENSITIVE_KEY = /authorization|cookie|password|token|secret|api[_-]?key|refresh|access/i;

function beforeSend(event: Sentry.ErrorEvent): Sentry.ErrorEvent | null {
  if (event.request?.headers) {
    for (const key of Object.keys(event.request.headers)) {
      if (SENSITIVE_KEY.test(key)) {
        event.request.headers[key] = '[Filtered]';
      }
    }
  }
  if (event.user) {
    delete event.user.email;
    delete event.user.ip_address;
  }
  return event;
}

export function initAdminSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release:
      import.meta.env.VITE_SENTRY_RELEASE ??
      import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA ??
      undefined,
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 0,
    beforeSend,
    initialScope: {
      tags: { surface: 'admin' },
    },
  });
}

export function captureAdminException(error: unknown, extra?: Record<string, unknown>): void {
  if (!import.meta.env.VITE_SENTRY_DSN) return;
  Sentry.captureException(error, extra ? { extra } : undefined);
}
