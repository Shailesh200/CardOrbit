import { describe, expect, it, vi } from 'vitest';

import { captureException, isSentryEnabled } from '../src/infrastructure/sentry/sentry';

describe('sentry helpers', () => {
  it('does not throw when SENTRY_DSN is unset', () => {
    const previous = process.env.SENTRY_DSN;
    delete process.env.SENTRY_DSN;

    expect(() => captureException(new Error('test'))).not.toThrow();
    expect(isSentryEnabled()).toBe(false);

    if (previous !== undefined) {
      process.env.SENTRY_DSN = previous;
    }
  });

  it('reports enabled when SENTRY_DSN is set', () => {
    const previous = process.env.SENTRY_DSN;
    process.env.SENTRY_DSN = 'https://examplePublicKey@o0.ingest.sentry.io/0';
    expect(isSentryEnabled()).toBe(true);
    if (previous === undefined) {
      delete process.env.SENTRY_DSN;
    } else {
      process.env.SENTRY_DSN = previous;
    }
  });
});

describe('privacy service contract', () => {
  it('requestExport returns pending export id shape', async () => {
    const create = vi.fn().mockResolvedValue({});
    const prisma = { auditLog: { create } } as never;

    const { PrivacyService } = await import('../src/modules/privacy/privacy.service');
    const service = new PrivacyService(prisma, { deleteAccountSelf: vi.fn() } as never);
    const result = await service.requestExport('user_test');
    expect(result.status).toBe('pending');
    expect(result.exportId).toMatch(/^exp_/);
    expect(create).toHaveBeenCalledOnce();
  });

  it('requestDeletion returns deletion_scheduled', async () => {
    const create = vi.fn().mockResolvedValue({});
    const deleteAccountSelf = vi.fn().mockResolvedValue({ status: 'deletion_scheduled' });
    const prisma = { auditLog: { create } } as never;
    const users = { deleteAccountSelf } as never;

    const { PrivacyService } = await import('../src/modules/privacy/privacy.service');
    const service = new PrivacyService(prisma, users);
    const result = await service.requestDeletion('user_test');

    expect(result.status).toBe('deletion_scheduled');
    expect(create).toHaveBeenCalledOnce();
    expect(deleteAccountSelf).toHaveBeenCalledWith('user_test');
  });
});
