import { describe, expect, it } from 'vitest';

import {
  applyStrategicBonuses,
  buildStrategicRationale,
  computeMilestoneStrategicBonus,
  computeStrategicScoreParts,
  computeTravelStrategicBonus,
  isTravelCategorySlug,
  type StrategicCardSignal,
} from '../strategic-ranking';
import {
  buildRecommendationSummary,
  rankCardRecommendations,
  type CardEvaluationCandidate,
} from '../recommendation-ranker';
import type { RewardEvaluationResult } from '../../../../rewards/domain/ports/reward-rule-evaluator.port';

function evaluation(
  overrides: Partial<RewardEvaluationResult> & { estimatedValueInr: number },
): RewardEvaluationResult {
  const { estimatedValueInr, ...rest } = overrides;
  return {
    ruleKey: 'test_rule',
    ruleName: 'Test Rule',
    versionNumber: 1,
    estimatedValueInr,
    estimatedRedemptionValueInr: estimatedValueInr,
    rewardPoints: 0,
    cashbackInr: estimatedValueInr,
    effectiveRatePercent: 5,
    milestoneBonusInr: 0,
    capped: false,
    excluded: false,
    benefitsApplied: ['5% cashback'],
    explanation: `₹${estimatedValueInr} cashback`,
    confidenceScore: 0.75,
    campaignApplied: false,
    milestoneCrossed: false,
    ...rest,
  };
}

function candidate(id: string, name: string, value: number): CardEvaluationCandidate {
  return {
    userCardId: `uc-${id}`,
    creditCardId: `cc-${id}`,
    cardName: name,
    bankName: 'Test Bank',
    bankSlug: 'test-bank',
    cardSlug: `card-${id}`,
    isFavorite: false,
    evaluation: evaluation({ estimatedValueInr: value }),
  };
}

describe('strategic-ranking helpers', () => {
  it('detects travel category slugs', () => {
    expect(isTravelCategorySlug('travel')).toBe(true);
    expect(isTravelCategorySlug('HOTEL')).toBe(true);
    expect(isTravelCategorySlug('dining')).toBe(false);
  });

  it('computes milestone strategic bonus from progress and contribution', () => {
    const signal: StrategicCardSignal = {
      userCardId: 'uc-1',
      milestoneProgressPercent: 80,
      milestoneRemainingInr: 10_000,
      milestoneBonusValueInr: 5_000,
      milestoneLabel: 'Spend ₹50k for 5k bonus',
      expiringRewardsInr: 0,
      travelAffinityScore: 0,
    };
    const bonus = computeMilestoneStrategicBonus(signal, 5_000);
    expect(bonus).toBeGreaterThan(0);
    expect(bonus).toBeLessThanOrEqual(5_000);
  });

  it('computes travel affinity bonus only for travel categories', () => {
    const signal: StrategicCardSignal = {
      userCardId: 'uc-1',
      milestoneProgressPercent: 0,
      milestoneRemainingInr: 0,
      milestoneBonusValueInr: 0,
      milestoneLabel: null,
      expiringRewardsInr: 0,
      travelAffinityScore: 0.8,
    };
    expect(computeTravelStrategicBonus(signal, true)).toBe(80);
    expect(computeTravelStrategicBonus(signal, false)).toBe(0);
  });
});

describe('rankCardRecommendations — V3 strategic (M-049)', () => {
  it('can tip ranking toward a lower immediate reward when milestones unlock long-term value', () => {
    const { ranked, engineVersion } = rankCardRecommendations(
      [candidate('1', 'Card A', 500), candidate('2', 'Card B', 420)],
      {
        engineVersion: 'v3',
        rankingContext: {
          amountInr: 10_000,
          isTravelCategory: false,
          strategicSignalsByUserCardId: {
            'uc-2': {
              milestoneProgressPercent: 85,
              milestoneRemainingInr: 12_000,
              milestoneBonusValueInr: 8_000,
              milestoneLabel: '15,000-point milestone',
              expiringRewardsInr: 0,
              travelAffinityScore: 0,
            },
          },
        },
      },
    );

    expect(engineVersion).toBe('v3');
    expect(ranked[0]?.cardName).toBe('Card B');
    expect(ranked[0]?.scoreBreakdown?.strategicMilestoneBonusInr).toBeGreaterThan(0);
    expect(ranked[0]?.strategicRationale).toContain('milestone');
  });

  it('boosts travel-affinity cards for travel spend', () => {
    const { ranked } = rankCardRecommendations(
      [candidate('1', 'Everyday Card', 300), candidate('2', 'Travel Card', 290)],
      {
        engineVersion: 'v3',
        rankingContext: {
          amountInr: 20_000,
          isTravelCategory: true,
          strategicSignalsByUserCardId: {
            'uc-2': {
              travelAffinityScore: 1,
              milestoneProgressPercent: 0,
              milestoneRemainingInr: 0,
              milestoneBonusValueInr: 0,
              expiringRewardsInr: 0,
            },
          },
        },
      },
    );

    expect(ranked[0]?.cardName).toBe('Travel Card');
    expect(ranked[0]?.scoreBreakdown?.strategicTravelBonusInr).toBeGreaterThan(0);
  });

  it('explains strategic tip in summary when immediate reward is lower', () => {
    const { ranked } = rankCardRecommendations(
      [candidate('1', 'Card A', 500), candidate('2', 'Card B', 400)],
      {
        engineVersion: 'v3',
        rankingContext: {
          amountInr: 10_000,
          strategicSignalsByUserCardId: {
            'uc-2': {
              milestoneProgressPercent: 90,
              milestoneRemainingInr: 8_000,
              milestoneBonusValueInr: 10_000,
              milestoneLabel: 'milestone',
              expiringRewardsInr: 0,
              travelAffinityScore: 0,
            },
          },
        },
      },
    );

    const summary = buildRecommendationSummary(ranked, 'MakeMyTrip', 'v3');
    expect(summary).toContain('Card B');
    expect(summary).toContain('fewer immediate rewards');
  });
});

describe('applyStrategicBonuses', () => {
  it('adds strategic components into composite', () => {
    const base = {
      rewardInr: 100,
      merchantBonusInr: 0,
      preferenceBonusInr: 0,
      promotionBonusInr: 0,
      strategicMilestoneBonusInr: 0,
      strategicExpiryBonusInr: 0,
      strategicTravelBonusInr: 0,
      compositeInr: 100,
    };
    const next = applyStrategicBonuses(base, {
      strategicMilestoneBonusInr: 50,
      strategicExpiryBonusInr: 10,
      strategicTravelBonusInr: 20,
    });
    expect(next.compositeInr).toBe(180);
    expect(
      buildStrategicRationale(
        undefined,
        {
          strategicMilestoneBonusInr: 50,
          strategicExpiryBonusInr: 10,
          strategicTravelBonusInr: 20,
        },
        100,
      ),
    ).toContain('long-term value');
  });
});

describe('computeStrategicScoreParts', () => {
  it('returns zeroes without signals', () => {
    expect(computeStrategicScoreParts(undefined, 1000, false)).toEqual({
      strategicMilestoneBonusInr: 0,
      strategicExpiryBonusInr: 0,
      strategicTravelBonusInr: 0,
    });
  });
});
