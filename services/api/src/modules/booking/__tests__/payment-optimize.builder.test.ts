import { describe, expect, it } from 'vitest';

import { buildPaymentOptimizeResult } from '../payment-optimize.builder';

describe('payment optimize builder', () => {
  it('ranks higher-reward card ahead on the same gross', () => {
    const result = buildPaymentOptimizeResult({
      offerId: 'offer-1',
      product: 'FLIGHT',
      grossPriceInr: 20_000,
      cards: [
        {
          userCardId: 'uc-low',
          cardName: 'Basic',
          bankName: 'Bank A',
          cashbackRate: 0.01,
          rewardValueRate: 0.01,
        },
        {
          userCardId: 'uc-high',
          cardName: 'Atlas',
          bankName: 'Axis',
          cashbackRate: 0.05,
          rewardValueRate: 0.06,
        },
      ],
    });
    expect(result.cards[0]?.userCardId).toBe('uc-high');
    expect(result.recommendedCardName).toBe('Atlas');
    expect(result.cards[0]?.effectiveCostInr).toBeLessThan(result.cards[1]?.effectiveCostInr ?? 0);
  });
});
