import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_REWARD_PERSONALIZATION, type UserAiContext } from '@cardwise/validation';

import { ContextEngineService } from '../context-engine.service';

describe('ContextEngineService', () => {
  const prisma = {
    user: { findUnique: vi.fn() },
    userCard: { findMany: vi.fn() },
  };

  const service = new ContextEngineService(prisma as never);

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.user.findUnique = vi.fn().mockResolvedValue({
      id: 'user-1',
      accountStatus: 'ACTIVE',
      personalizationProfile: DEFAULT_REWARD_PERSONALIZATION,
    });
    prisma.userCard.findMany = vi.fn().mockResolvedValue([
      {
        isFavorite: true,
        creditCard: {
          slug: 'idfc-first-first-private',
          name: 'IDFC FIRST Private Credit Card',
          tier: 'ULTRA_PREMIUM',
          bank: { slug: 'idfc-first' },
          benefits: [{ title: 'Forex markup' }],
        },
      },
    ]);
  });

  it('builds portfolio context without PII fields', async () => {
    const context = await service.buildUserContext('user-1');

    expect(context.portfolioCount).toBe(1);
    expect(context.favoriteCount).toBe(1);
    expect(context.portfolioCards[0]?.benefitHighlights).toContain('Forex markup');
    expect(context as UserAiContext).not.toHaveProperty('email');
  });
});
