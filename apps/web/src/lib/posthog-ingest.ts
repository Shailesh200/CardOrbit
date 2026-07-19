/** Resolve PostHog browser capture URL from VITE_POSTHOG_HOST. */

export function resolvePostHogCaptureUrl(hostEnv?: string): string {
  const host = (hostEnv ?? '').trim().replace(/\/$/, '');
  if (!host || /(?:^https?:\/\/)?(?:app|us)\.posthog\.com$/i.test(host)) {
    return 'https://us.i.posthog.com/i/v0/e/';
  }
  if (/(?:^https?:\/\/)?eu\.posthog\.com$/i.test(host)) {
    return 'https://eu.i.posthog.com/i/v0/e/';
  }
  if (/\/i\/v0\/e\/?$/i.test(host)) {
    return host.endsWith('/') ? host : `${host}/`;
  }
  if (/i\.posthog\.com$/i.test(host)) {
    return `${host}/i/v0/e/`;
  }
  return `${host}/i/v0/e/`;
}
