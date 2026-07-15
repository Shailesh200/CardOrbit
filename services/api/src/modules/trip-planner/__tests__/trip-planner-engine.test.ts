import { describe, expect, it } from 'vitest';

import {
  buildCategoryRecommendations,
  buildLoungeEligibility,
  buildTripPlanResult,
  computeTripDays,
  inferTripScope,
  isLoungeEligibleForScope,
  rankEvaluationsForCategory,
  splitTripBudget,
  type TripCardEvaluation,
  type TripCardSnapshot,
} from '../trip-planner-engine';

describe('computeTripDays', () => {
  it('counts inclusive trip days', () => {
    expect(computeTripDays('2026-08-01', '2026-08-03')).toBe(3);
    expect(computeTripDays('2026-08-01', '2026-08-01')).toBe(1);
  });
});

describe('inferTripScope', () => {
  it('detects international destinations', () => {
    expect(inferTripScope('Dubai')).toBe('INTERNATIONAL');
    expect(inferTripScope('Singapore trip')).toBe('INTERNATIONAL');
  });

  it('defaults to domestic for common Indian destinations', () => {
    expect(inferTripScope('Goa')).toBe('DOMESTIC');
    expect(inferTripScope('Mumbai')).toBe('DOMESTIC');
  });
});

describe('splitTripBudget', () => {
  it('allocates budget across travel categories', () => {
    const breakdown = splitTripBudget(100_000, 3);
    expect(
      breakdown.flightsInr + breakdown.hotelsInr + breakdown.diningInr + breakdown.transportInr,
    ).toBe(100_000);
    expect(breakdown.flightsInr).toBeGreaterThan(breakdown.transportInr);
  });
});

describe('isLoungeEligibleForScope', () => {
  it('matches domestic lounge benefits', () => {
    expect(
      isLoungeEligibleForScope(
        [
          {
            title: '4 domestic lounge visits per year',
            description: null,
            allowanceLabel: '4 visits/year',
          },
        ],
        'DOMESTIC',
      ),
    ).toBe(true);
  });

  it('requires international wording for international trips', () => {
    const domesticOnly = isLoungeEligibleForScope(
      [{ title: 'Domestic lounge access', description: null, allowanceLabel: null }],
      'INTERNATIONAL',
    );
    const international = isLoungeEligibleForScope(
      [
        {
          title: 'International lounge via Priority Pass',
          description: null,
          allowanceLabel: null,
        },
      ],
      'INTERNATIONAL',
    );
    expect(domesticOnly).toBe(false);
    expect(international).toBe(true);
  });
});

describe('rankEvaluationsForCategory', () => {
  it('ranks by reward value with preference boost', () => {
    const evaluations: TripCardEvaluation[] = [
      {
        userCardId: 'a',
        creditCardId: 'c1',
        cardName: 'Card A',
        bankName: 'Bank A',
        category: 'FLIGHTS',
        spendAmountInr: 45_000,
        expectedRewardInr: 900,
        estimatedPoints: 900,
        effectiveRatePercent: 2,
        ruleName: 'Travel 2x',
        excluded: false,
        preferenceBoost: 0,
      },
      {
        userCardId: 'b',
        creditCardId: 'c2',
        cardName: 'Card B',
        bankName: 'Bank B',
        category: 'FLIGHTS',
        spendAmountInr: 45_000,
        expectedRewardInr: 850,
        estimatedPoints: 850,
        effectiveRatePercent: 1.89,
        ruleName: 'Airline bonus',
        excluded: false,
        preferenceBoost: 250,
      },
    ];

    const ranked = rankEvaluationsForCategory(evaluations);
    expect(ranked[0]?.cardName).toBe('Card B');
  });
});

describe('buildTripPlanResult', () => {
  it('assembles a card-aware trip plan', () => {
    const cards: TripCardSnapshot[] = [
      {
        userCardId: 'uc1',
        creditCardId: 'cc1',
        cardName: 'Travel Card',
        bankName: 'Test Bank',
        loungeSummary: '4 visits/year',
        loungeBenefits: [
          {
            title: 'Domestic lounge',
            description: '4 visits per year',
            allowanceLabel: '4 visits/year',
          },
        ],
        travelBenefits: [{ title: 'Travel insurance', description: 'Up to ₹1Cr' }],
        milesBalances: [{ kind: 'MILES', availableAmount: 25_000, estimatedValueInr: 12_500 }],
        travelOffers: [{ title: '10% off flights', description: 'On partner airline' }],
      },
    ];

    const evaluations: TripCardEvaluation[] = [
      {
        userCardId: 'uc1',
        creditCardId: 'cc1',
        cardName: 'Travel Card',
        bankName: 'Test Bank',
        category: 'FLIGHTS',
        spendAmountInr: 45_000,
        expectedRewardInr: 1_350,
        estimatedPoints: 1_350,
        effectiveRatePercent: 3,
        ruleName: 'Travel 3x',
        excluded: false,
        preferenceBoost: 0,
      },
      {
        userCardId: 'uc1',
        creditCardId: 'cc1',
        cardName: 'Travel Card',
        bankName: 'Test Bank',
        category: 'HOTELS',
        spendAmountInr: 38_000,
        expectedRewardInr: 760,
        estimatedPoints: 760,
        effectiveRatePercent: 2,
        ruleName: 'Travel 2x',
        excluded: false,
        preferenceBoost: 0,
      },
      {
        userCardId: 'uc1',
        creditCardId: 'cc1',
        cardName: 'Travel Card',
        bankName: 'Test Bank',
        category: 'DINING',
        spendAmountInr: 12_000,
        expectedRewardInr: 120,
        estimatedPoints: 120,
        effectiveRatePercent: 1,
        ruleName: 'Dining 1x',
        excluded: false,
        preferenceBoost: 0,
      },
      {
        userCardId: 'uc1',
        creditCardId: 'cc1',
        cardName: 'Travel Card',
        bankName: 'Test Bank',
        category: 'TRANSPORT',
        spendAmountInr: 5_000,
        expectedRewardInr: 50,
        estimatedPoints: 50,
        effectiveRatePercent: 1,
        ruleName: 'Travel 1x',
        excluded: false,
        preferenceBoost: 0,
      },
    ];

    const result = buildTripPlanResult({
      plan: {
        destination: 'Goa',
        startDate: '2026-09-01',
        endDate: '2026-09-04',
        budgetInr: 100_000,
      },
      cards,
      evaluations,
    });

    expect(result.scope).toBe('DOMESTIC');
    expect(result.tripDays).toBe(4);
    expect(result.recommendedCards).toHaveLength(4);
    expect(result.loungeEligibility[0]?.eligible).toBe(true);
    expect(result.totalEstimatedValueInr).toBeGreaterThan(0);
    expect(result.summary).toContain('Goa');
  });
});

describe('buildCategoryRecommendations', () => {
  it('returns null recommended card when no eligible evaluations', () => {
    const breakdown = splitTripBudget(50_000, 2);
    const recommendations = buildCategoryRecommendations([], breakdown);
    expect(recommendations.every((row) => row.recommendedCard === null)).toBe(true);
  });
});

describe('buildLoungeEligibility', () => {
  it('sorts eligible cards first', () => {
    const cards: TripCardSnapshot[] = [
      {
        userCardId: '1',
        creditCardId: 'c1',
        cardName: 'No Intl',
        bankName: 'Bank',
        loungeSummary: null,
        loungeBenefits: [{ title: 'Domestic lounge', description: null, allowanceLabel: null }],
        travelBenefits: [],
        milesBalances: [],
        travelOffers: [],
      },
      {
        userCardId: '2',
        creditCardId: 'c2',
        cardName: 'Intl',
        bankName: 'Bank',
        loungeSummary: null,
        loungeBenefits: [
          { title: 'International Priority Pass', description: null, allowanceLabel: null },
        ],
        travelBenefits: [],
        milesBalances: [],
        travelOffers: [],
      },
    ];

    const rows = buildLoungeEligibility(cards, 'INTERNATIONAL');
    expect(rows[0]?.eligible).toBe(true);
    expect(rows[0]?.cardName).toBe('Intl');
  });
});
