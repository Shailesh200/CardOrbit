import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { UserCardsService } from '../../user-cards/user-cards.service';
import { OfferMatchingService } from '../offer-matching.service';

function buildOffer(overrides: Record<string, unknown> = {}) {
  return {
    id: 'offer-1',
    slug: 'amazon-icici-5-cashback',
    title: '5% cashback on Amazon',
    description: 'Extra cashback on Amazon India spends.',
    type: 'MERCHANT',
    cashbackPercent: { toString: () => '5' },
    capInr: { toString: () => '250' },
    termsSummary: 'Cap ₹250 per billing cycle.',
    validFrom: new Date('2026-01-01T00:00:00.000Z'),
    validUntil: new Date('2026-12-31T23:59:59.000Z'),
    status: 'ACTIVE',
    issuerBankId: 'bank-icici',
    deletedAt: null,
    issuerBank: { id: 'bank-icici', name: 'ICICI Bank', slug: 'icici' },
    cardAssignments: [
      {
        deletedAt: null,
        creditCard: {
          id: 'card-icici-amazon',
          slug: 'icici-amazon-pay',
          name: 'ICICI Amazon Pay',
          deletedAt: null,
          active: true,
          bank: { id: 'bank-icici', name: 'ICICI Bank', slug: 'icici' },
        },
      },
    ],
    merchants: [
      {
        deletedAt: null,
        merchant: {
          id: 'merchant-amazon',
          slug: 'amazon',
          name: 'Amazon',
          deletedAt: null,
          active: true,
        },
      },
    ],
    ...overrides,
  };
}

describe('OfferMatchingService', () => {
  const prisma = {
    user: { findUnique: vi.fn() },
    merchant: { findFirst: vi.fn() },
    offer: { findMany: vi.fn(), findFirst: vi.fn() },
  } as unknown as PrismaService;

  const userCards = {
    listPortfolio: vi.fn(),
  } as unknown as UserCardsService;

  const service = new OfferMatchingService(prisma, userCards);

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.user.findUnique = vi.fn().mockResolvedValue({ id: 'user-1', accountStatus: 'ACTIVE' });
    userCards.listPortfolio = vi.fn().mockResolvedValue([
      {
        id: 'user-card-1',
        creditCardId: 'card-icici-amazon',
        card: {
          slug: 'icici-amazon-pay',
          name: 'ICICI Amazon Pay',
          bank: { id: 'bank-icici', name: 'ICICI Bank', slug: 'icici' },
        },
      },
    ]);
    prisma.offer.findMany = vi.fn().mockResolvedValue([buildOffer()]);
    prisma.merchant.findFirst = vi.fn().mockResolvedValue({ id: 'merchant-amazon' });
  });

  it('matches active offers for a portfolio card', async () => {
    const response = await service.matchOffers('user-1', {
      limit: 10,
      status: 'active',
      amountInr: 2500,
    });

    expect(response.items).toHaveLength(1);
    expect(response.items[0]?.isEligible).toBe(true);
    expect(response.items[0]?.bestEstimatedSavingsInr).toBe(125);
  });

  it('filters offers by merchant slug', async () => {
    prisma.offer.findMany = vi.fn().mockResolvedValue([
      buildOffer(),
      buildOffer({
        id: 'offer-2',
        slug: 'flipkart-axis-10-off',
        title: '10% instant discount on Flipkart',
        merchants: [
          {
            deletedAt: null,
            merchant: {
              id: 'merchant-flipkart',
              slug: 'flipkart',
              name: 'Flipkart',
              deletedAt: null,
              active: true,
            },
          },
        ],
      }),
    ]);

    const response = await service.matchOffers('user-1', {
      merchantSlug: 'amazon',
      limit: 10,
      status: 'active',
    });

    expect(response.items).toHaveLength(1);
    expect(response.items[0]?.merchants[0]?.slug).toBe('amazon');
  });

  it('marks offers ineligible when portfolio is empty', async () => {
    userCards.listPortfolio = vi.fn().mockResolvedValue([]);

    const response = await service.matchOffers('user-1', {
      limit: 10,
      status: 'active',
    });

    expect(response.items[0]?.isEligible).toBe(false);
    expect(response.items[0]?.ineligibilityReason).toContain('Add a card');
  });

  it('returns offer detail by slug', async () => {
    prisma.offer.findFirst = vi.fn().mockResolvedValue(buildOffer());

    const offer = await service.getOfferBySlug('user-1', 'amazon-icici-5-cashback', 2500);

    expect(offer?.slug).toBe('amazon-icici-5-cashback');
    expect(offer?.eligibleCards[0]?.userCardId).toBe('user-card-1');
  });
});
