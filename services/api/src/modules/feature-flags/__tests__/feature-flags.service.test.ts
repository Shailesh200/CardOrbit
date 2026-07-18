import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FeatureFlag, initFeatureFlags, shutdownFeatureFlags } from '@cardwise/feature-flags';

import { FeatureFlagsService } from '../feature-flags.service';

describe('FeatureFlagsService', () => {
  const prisma = {
    featureFlagDefinition: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    auditLog: {
      create: vi.fn(),
    },
  };

  const service = new FeatureFlagsService(prisma as never);

  beforeEach(async () => {
    vi.clearAllMocks();
    await shutdownFeatureFlags();
    initFeatureFlags({ useLocalOnly: true });
    prisma.featureFlagDefinition.findUnique.mockResolvedValue({ id: 'existing' });
    prisma.featureFlagDefinition.findMany.mockResolvedValue([
      {
        id: 'flag-1',
        key: FeatureFlag.AI_INSIGHTS_ENABLED,
        description: null,
        enabled: true,
        rolloutPercentage: 100,
        updatedBy: null,
        updatedAt: new Date('2026-07-11T00:00:00.000Z'),
      },
    ]);
  });

  it('evaluates flags using DB definitions and user bucket', async () => {
    await service.onModuleInit();
    expect(await service.isEnabled(FeatureFlag.AI_INSIGHTS_ENABLED, 'user-123')).toBe(true);
  });

  it('updates definitions and writes audit log', async () => {
    await service.onModuleInit();

    prisma.featureFlagDefinition.findUnique.mockResolvedValue({
      id: 'flag-1',
      key: FeatureFlag.ONBOARDING_V1,
      description: null,
      enabled: true,
      rolloutPercentage: 100,
      updatedBy: null,
      updatedAt: new Date('2026-07-11T00:00:00.000Z'),
    });
    prisma.featureFlagDefinition.update.mockResolvedValue({
      id: 'flag-1',
      key: FeatureFlag.ONBOARDING_V1,
      description: null,
      enabled: true,
      rolloutPercentage: 25,
      updatedBy: 'admin-1',
      updatedAt: new Date('2026-07-11T01:00:00.000Z'),
    });
    prisma.featureFlagDefinition.findMany.mockResolvedValue([
      {
        id: 'flag-1',
        key: FeatureFlag.ONBOARDING_V1,
        description: null,
        enabled: true,
        rolloutPercentage: 25,
        updatedBy: 'admin-1',
        updatedAt: new Date('2026-07-11T01:00:00.000Z'),
      },
    ]);

    const updated = await service.updateDefinition(
      FeatureFlag.ONBOARDING_V1,
      { rolloutPercentage: 25 },
      'admin-1',
    );

    expect(updated.rolloutPercentage).toBe(25);
    expect(prisma.auditLog.create).toHaveBeenCalledOnce();
  });
});
