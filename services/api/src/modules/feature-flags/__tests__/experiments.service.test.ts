import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ExperimentsService } from '../experiments.service';

describe('ExperimentsService', () => {
  const prisma = {
    experimentDefinition: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.experimentDefinition.findUnique.mockResolvedValue(null);
    prisma.experimentDefinition.create.mockResolvedValue({});
    prisma.experimentDefinition.findMany.mockResolvedValue([
      {
        id: 'exp-1',
        key: 'reco_ranking_v2',
        name: 'Recommendation ranking V2',
        description: null,
        variants: ['control', 'ranking_signals'],
        defaultVariant: 'control',
        enabled: true,
        rolloutPercentage: 100,
        updatedBy: null,
        updatedAt: new Date('2026-07-12T00:00:00.000Z'),
      },
    ]);
    prisma.experimentDefinition.findUnique.mockResolvedValue({
      id: 'exp-1',
      key: 'reco_ranking_v2',
      enabled: true,
      rolloutPercentage: 100,
      description: null,
      name: 'Recommendation ranking V2',
      updatedBy: null,
    });
    prisma.auditLog.create.mockResolvedValue({});
  });

  it('returns stable variant assignments for a distinct id', async () => {
    const service = new ExperimentsService(prisma as never);
    await service.onModuleInit();

    const first = await service.getAssignmentsSnapshot('user-abc');
    const second = await service.getAssignmentsSnapshot('user-abc');

    expect(first.assignments.reco_ranking_v2).toBe(second.assignments.reco_ranking_v2);
    expect(['control', 'ranking_signals']).toContain(first.assignments.reco_ranking_v2);
  });
});
