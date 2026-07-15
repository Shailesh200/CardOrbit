import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { RecommendationHistoryService } from '../recommendation-history.service';

describe('RecommendationHistoryService', () => {
  const prisma = {
    user: { findUnique: vi.fn() },
    recommendationHistory: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
    },
    recommendationFeedback: {
      upsert: vi.fn(),
    },
  } as unknown as PrismaService;

  const service = new RecommendationHistoryService(prisma);

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.user.findUnique = vi.fn().mockResolvedValue({ id: 'user-1', accountStatus: 'ACTIVE' });
  });

  it('lists recommendation history for the signed-in user', async () => {
    prisma.recommendationHistory.findMany = vi.fn().mockResolvedValue([
      {
        id: '01900000-0000-7000-8000-000000000001',
        userId: 'user-1',
        amountInr: { toString: () => '2500' },
        merchantSlug: 'swiggy',
        merchantName: 'Swiggy',
        recommendedCardName: 'HDFC Regalia Gold',
        expectedRewardInr: { toString: () => '375' },
        rankingVersion: 'v2',
        source: 'WEB',
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
        feedback: null,
      },
    ]);
    prisma.recommendationHistory.count = vi.fn().mockResolvedValue(1);

    const response = await service.listHistory('user-1', { limit: 20 });

    expect(response.items).toHaveLength(1);
    expect(response.items[0]?.merchantSlug).toBe('swiggy');
  });

  it('upserts feedback for a recommendation', async () => {
    prisma.recommendationHistory.findFirst = vi.fn().mockResolvedValue({
      id: '01900000-0000-7000-8000-000000000001',
      merchantSlug: 'swiggy',
      source: 'WEB',
    });
    prisma.recommendationFeedback.upsert = vi.fn().mockResolvedValue({
      type: 'USEFUL',
      comment: null,
      createdAt: new Date('2026-07-12T00:00:00.000Z'),
      updatedAt: new Date('2026-07-12T00:00:00.000Z'),
    });

    const response = await service.submitFeedback(
      'user-1',
      '01900000-0000-7000-8000-000000000001',
      { type: 'USEFUL' },
    );

    expect(response.feedback.type).toBe('USEFUL');
  });
});
