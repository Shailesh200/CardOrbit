import * as Sentry from '@sentry/node';

let initialized = false;

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn || initialized) {
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0.1,
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
