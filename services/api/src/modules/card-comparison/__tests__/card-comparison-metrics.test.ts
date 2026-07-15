import { describe, expect, it } from 'vitest';

import {
  buildComparisonRows,
  extractForexMarkup,
  pickRecommendedCard,
  summarizeBenefits,
  type CardComparisonSnapshot,
} from '../card-comparison-metrics';

function snapshot(overrides: Partial<CardComparisonSnapshot>): CardComparisonSnapshot {
  return {
    userCardId: 'uc-1',
    creditCardId: 'cc-1',
    cardName: 'Card A',
    nickname: null,
    bankName: 'Bank A',
    bankSlug: 'bank-a',
    cardSlug: 'card-a',
    tier: 'PREMIUM',
    isFavorite: false,
    annualFeeInr: 2500,
    joiningFeeInr: 2500,
    maxRewardMultiplier: 5,
    maxCashbackPercent: null,
    pointValueInr: 0.3,
    loungeSummary: '4 visits',
    insuranceSummary: '—',
    fuelSummary: '—',
    travelSummary: '—',
    welcomeSummary: '—',
    forexMarkupSummary: '2%',
    milestoneCount: 1,
    offerCount: 2,
    benefitCount: 8,
    walletValueInr: 1500,
    ...overrides,
  };
}

describe('card comparison metrics', () => {
  it('summarizes benefit lists', () => {
    expect(
      summarizeBenefits([
        {
          id: '1',
          title: 'Domestic lounge',
          description: null,
          sectionCode: 'LOUNGE',
          sectionLabel: 'Lounge',
          sourceUrl: null,
        },
        {
          id: '2',
          title: 'International lounge',
          description: null,
          sectionCode: 'LOUNGE',
          sectionLabel: 'Lounge',
          sourceUrl: null,
        },
      ]),
    ).toBe('Domestic lounge +1 more');
  });

  it('extracts forex markup from fee benefits', () => {
    const value = extractForexMarkup([
      {
        id: '1',
        title: 'Forex markup',
        description: '2.5% on international spends',
        sectionCode: 'FEES',
        sectionLabel: 'Fees',
        sourceUrl: null,
      },
    ]);
    expect(value).toBe('2.5%');
  });

  it('highlights lowest annual fee', () => {
    const rows = buildComparisonRows([
      snapshot({ userCardId: 'uc-1', annualFeeInr: 2500 }),
      snapshot({ userCardId: 'uc-2', creditCardId: 'cc-2', cardName: 'Card B', annualFeeInr: 0 }),
    ]);

    const annualFeeRow = rows.find((row) => row.id === 'annual-fee');
    expect(annualFeeRow?.bestUserCardId).toBe('uc-2');
    expect(annualFeeRow?.isDifferent).toBe(true);
  });

  it('picks recommended card by composite score', () => {
    const recommended = pickRecommendedCard([
      snapshot({ userCardId: 'uc-1', maxRewardMultiplier: 2, annualFeeInr: 5000 }),
      snapshot({
        userCardId: 'uc-2',
        creditCardId: 'cc-2',
        maxCashbackPercent: 5,
        maxRewardMultiplier: null,
        annualFeeInr: 0,
      }),
    ]);
    expect(recommended).toBe('uc-2');
  });
});
