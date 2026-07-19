import { describe, expect, it } from 'vitest';

import { resolvePostHogCaptureUrl } from './posthog-ingest';

describe('resolvePostHogCaptureUrl', () => {
  it('defaults US UI hosts to US ingest', () => {
    expect(resolvePostHogCaptureUrl(undefined)).toBe('https://us.i.posthog.com/i/v0/e/');
    expect(resolvePostHogCaptureUrl('https://app.posthog.com')).toBe(
      'https://us.i.posthog.com/i/v0/e/',
    );
    expect(resolvePostHogCaptureUrl('https://us.posthog.com')).toBe(
      'https://us.i.posthog.com/i/v0/e/',
    );
  });

  it('maps EU UI host to EU ingest', () => {
    expect(resolvePostHogCaptureUrl('https://eu.posthog.com')).toBe(
      'https://eu.i.posthog.com/i/v0/e/',
    );
  });
});
