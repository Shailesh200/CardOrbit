import { describe, expect, it } from 'vitest';

import { RewardExpiryIntelligenceSchema } from '@cardwise/validation';

describe('reward expiry validation', () => {
  it('accepts a complete intelligence payload', () => {
    const payload = {
      expiringSoon: [
        {
          balanceId: 'bal-1',
          userCardId: 'uc-1',
          cardName: 'HDFC Regalia',
          bankName: 'HDFC Bank',
          bankSlug: 'hdfc',
          cardSlug: 'regalia',
          kind: 'POINTS',
          expiringAmount: 5200,
          expiringAt: '2026-07-24T00:00:00.000Z',
          daysRemaining: 12,
          estimatedValueInr: 1850,
          urgencyScore: 154.17,
          alertWindow: 14,
        },
      ],
      highValue: [],
      redeemFirst: [
        {
          balanceId: 'bal-1',
          userCardId: 'uc-1',
          cardName: 'HDFC Regalia',
          bankName: 'HDFC Bank',
          bankSlug: 'hdfc',
          cardSlug: 'regalia',
          kind: 'POINTS',
          expiringAmount: 5200,
          expiringAt: '2026-07-24T00:00:00.000Z',
          daysRemaining: 12,
          estimatedValueInr: 1850,
          urgencyScore: 154.17,
          alertWindow: 14,
          priorityRank: 1,
          rationale:
            'Reward points (~₹1,850) expiring soon — redeem for vouchers or transfer partners.',
        },
      ],
      strategy: {
        summary:
          'Redeem HDFC Regalia reward points first — 5,200 expire in 12 days (~₹1,850 value).',
        redeemFirst: [],
        highValue: [],
      },
      totalExpiringValueInr: 1850,
      alertsDelivered: 1,
    };

    expect(() => RewardExpiryIntelligenceSchema.parse(payload)).not.toThrow();
  });
});
