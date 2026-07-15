import { describe, expect, it } from 'vitest';

import { CardBenefitsDashboardSchema } from '@cardwise/validation';

describe('card benefits validation', () => {
  it('accepts a complete dashboard payload', () => {
    const payload = {
      overview: {
        userCardId: 'uc-1',
        creditCardId: 'cc-1',
        cardName: 'HDFC Regalia',
        nickname: null,
        bankName: 'HDFC Bank',
        bankSlug: 'hdfc',
        cardSlug: 'regalia',
        networkName: 'Visa',
        tier: 'PREMIUM',
        status: 'ACTIVE',
        isFavorite: false,
        sourceUrl: null,
        statementDay: 5,
        dueDay: 25,
        rewardProgramName: 'Regalia Rewards',
        pointValueInr: 0.3,
        benefitCount: 2,
        wallet: {
          totalEstimatedValueInr: 1500,
          expiringSoonCount: 0,
          lastSyncedAt: null,
        },
      },
      benefitSections: [
        {
          code: 'LOUNGE',
          label: 'Lounge access',
          items: [
            {
              id: 'b1',
              title: 'Domestic lounge',
              description: '4 per quarter',
              sectionCode: 'LOUNGE',
              sectionLabel: 'Lounge access',
              sourceUrl: null,
            },
          ],
        },
      ],
      rewardRules: [],
      milestones: [],
      offers: [],
      loungeAccess: [],
      insurance: [],
      annualFee: {
        annualFeeInr: 2500,
        joiningFeeInr: 2500,
        fees: [],
        feeBenefits: [],
      },
      recommendationHistory: [],
    };

    expect(() => CardBenefitsDashboardSchema.parse(payload)).not.toThrow();
  });
});
