import { describe, expect, it } from 'vitest';

import { CompareCardsInputSchema, CardComparisonResultSchema } from '@cardwise/validation';

describe('card comparison validation', () => {
  it('requires 2–4 unique portfolio card ids', () => {
    expect(() => CompareCardsInputSchema.parse({ userCardIds: ['a'] })).toThrow();
    expect(() =>
      CompareCardsInputSchema.parse({ userCardIds: ['a', 'b', 'c', 'd', 'e'] }),
    ).toThrow();
    expect(() => CompareCardsInputSchema.parse({ userCardIds: ['a', 'b'] })).not.toThrow();
    expect(() => CompareCardsInputSchema.parse({ creditCardIds: ['a', 'b'] })).not.toThrow();
    expect(() =>
      CompareCardsInputSchema.parse({ userCardIds: ['a', 'b'], creditCardIds: ['c', 'd'] }),
    ).toThrow();
  });

  it('accepts comparison result payload', () => {
    const payload = {
      columns: [
        {
          userCardId: 'uc-1',
          creditCardId: 'cc-1',
          cardName: 'Card A',
          nickname: null,
          bankName: 'Bank A',
          bankSlug: 'bank-a',
          cardSlug: 'card-a',
          tier: 'PREMIUM',
          isFavorite: false,
        },
        {
          userCardId: 'uc-2',
          creditCardId: 'cc-2',
          cardName: 'Card B',
          nickname: null,
          bankName: 'Bank B',
          bankSlug: 'bank-b',
          cardSlug: 'card-b',
          tier: 'STANDARD',
          isFavorite: true,
        },
      ],
      rows: [
        {
          id: 'annual-fee',
          group: 'fees',
          label: 'Annual fee',
          values: { 'uc-1': '₹2,500', 'uc-2': '—' },
          bestUserCardId: 'uc-2',
          highlight: 'lowest',
          isDifferent: true,
        },
      ],
      recommendedUserCardId: 'uc-2',
    };

    expect(() => CardComparisonResultSchema.parse(payload)).not.toThrow();
  });
});
