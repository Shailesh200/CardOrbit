import { describe, expect, it } from 'vitest';

import {
  SeedBanksFileSchema,
  SeedCardsFileSchema,
  SeedMerchantsFileSchema,
  SeedOffersFileSchema,
  SeedRewardRulesFileSchema,
} from './seed-schemas';

describe('seed file Zod schemas', () => {
  it('rejects malformed banks file', () => {
    const result = SeedBanksFileSchema.safeParse({
      networks: [{ code: 'VISA', name: 'Visa', slug: 'visa' }],
      banks: [{ name: 'HDFC', slug: 'INVALID SLUG' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects cards without required bankSlug', () => {
    const result = SeedCardsFileSchema.safeParse({
      rewardPrograms: [{ name: 'SmartBuy', slug: 'smartbuy' }],
      spendCategories: [{ code: 'TRAVEL', name: 'Travel', slug: 'travel' }],
      cards: [
        {
          name: 'Infinia',
          slug: 'hdfc-infinia',
          networkCode: 'VISA',
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects merchants with empty name', () => {
    const result = SeedMerchantsFileSchema.safeParse({
      categories: [{ code: 'SHOP', name: 'Shopping', slug: 'shopping' }],
      merchants: [{ name: '', slug: 'amazon' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects reward rules with invalid payload', () => {
    const result = SeedRewardRulesFileSchema.safeParse({
      rules: [
        {
          ruleKey: 'bad',
          name: 'Bad',
          cardSlug: 'hdfc-infinia',
          payload: { cap: 100 },
          validFrom: '2026-01-01',
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects offers with bad type', () => {
    const result = SeedOffersFileSchema.safeParse({
      offers: [
        {
          code: 'x',
          slug: 'x',
          title: 'X',
          type: 'WALLET',
          validFrom: '2026-01-01',
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});
