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
  return event;
}

export function initWorkerSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn || initialized) return;

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    release: process.env.SENTRY_RELEASE ?? process.env.GIT_COMMIT_SHA ?? undefined,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 0,
    beforeSend,
    initialScope: {
      tags: { service: 'worker' },
    },
  });
  initialized = true;
}

export function captureWorkerException(error: unknown): void {
  if (!process.env.SENTRY_DSN) return;
  Sentry.captureException(error);
}
