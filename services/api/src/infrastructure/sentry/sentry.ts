import * as Sentry from '@sentry/node';

let initialized = false;

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

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn || initialized) {
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    release: process.env.SENTRY_RELEASE ?? process.env.GIT_COMMIT_SHA ?? undefined,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
    beforeSend,
    initialScope: {
      tags: { service: 'api' },
    },
  });
  initialized = true;
}

export function captureException(error: unknown): void {
  if (!process.env.SENTRY_DSN) {
    return;
  }
  Sentry.captureException(error);
}

export function isSentryEnabled(): boolean {
  return Boolean(process.env.SENTRY_DSN);
}
