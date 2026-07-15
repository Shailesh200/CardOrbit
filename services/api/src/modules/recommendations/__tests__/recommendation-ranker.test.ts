import { describe, expect, it } from 'vitest';

import { computeRecommendationScore } from '@cardwise/validation';

import type { RewardEvaluationResult } from '../../rewards/domain/ports/reward-rule-evaluator.port';
import {
  buildRecommendationSummary,
  rankCardRecommendations,
  type CardEvaluationCandidate,
} from '../domain/services/recommendation-ranker';

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

function candidate(
  id: string,
  name: string,
  value: number | null,
  excluded = false,
  isFavorite = false,
): CardEvaluationCandidate {
  return {
    userCardId: `uc-${id}`,
    creditCardId: `cc-${id}`,
    cardName: name,
    bankName: 'Test Bank',
    bankSlug: 'test-bank',
    cardSlug: `card-${id}`,
    isFavorite,
    evaluation:
      value === null
        ? null
        : evaluation({
            estimatedValueInr: value,
            excluded,
            exclusionReason: excluded ? 'fuel excluded' : undefined,
            explanation: excluded ? 'No reward — fuel excluded' : `₹${value} cashback`,
          }),
  };
}

describe('rankCardRecommendations', () => {
  it('ranks cards by expected reward descending', () => {
    const { ranked } = rankCardRecommendations([
      candidate('1', 'Card A', 250),
      candidate('2', 'Card B', 500),
      candidate('3', 'Card C', 100),
    ]);

    expect(ranked.map((row) => row.cardName)).toEqual(['Card B', 'Card A', 'Card C']);
    expect(ranked[0]?.score).toBe(100);
    expect(ranked[1]?.score).toBe(50);
    expect(ranked[2]?.score).toBe(20);
  });

  it('excludes null and zero-value evaluations from ranking', () => {
    const { ranked, audit } = rankCardRecommendations([
      candidate('1', 'Card A', null),
      candidate('2', 'Card B', 0),
      candidate('3', 'Card C', 300),
    ]);

    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.cardName).toBe('Card C');
    expect(audit.filter((row) => row.eligible)).toHaveLength(1);
  });

  it('excludes flagged exclusion results from ranking', () => {
    const { ranked } = rankCardRecommendations([
      candidate('1', 'Card A', 500, true),
      candidate('2', 'Card B', 200),
    ]);

    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.cardName).toBe('Card B');
  });

  it('breaks ties alphabetically by card name', () => {
    const { ranked } = rankCardRecommendations([
      candidate('1', 'Zeta Card', 500),
      candidate('2', 'Alpha Card', 500),
    ]);

    expect(ranked[0]?.cardName).toBe('Alpha Card');
    expect(ranked[1]?.cardName).toBe('Zeta Card');
    expect(ranked[0]?.score).toBe(100);
    expect(ranked[1]?.score).toBe(100);
  });

  it('returns empty ranking when no eligible cards', () => {
    const { ranked } = rankCardRecommendations([candidate('1', 'Card A', null)]);
    expect(ranked).toHaveLength(0);
  });
});

describe('buildRecommendationSummary', () => {
  it('summarizes the best card', () => {
    const { ranked } = rankCardRecommendations([
      candidate('1', 'HDFC Infinia', 375),
      candidate('2', 'SBI Cashback', 250),
    ]);

    const summary = buildRecommendationSummary(ranked, 'Amazon');
    expect(summary).toContain('HDFC Infinia');
    expect(summary).toContain('375');
  });

  it('handles no eligible cards', () => {
    expect(buildRecommendationSummary([], 'Amazon')).toContain('No eligible card rewards');
  });
});

describe('rankCardRecommendations — V2 contextual scoring (M-027)', () => {
  it('ranks by composite score when favorite bonus tips a close decision', () => {
    const { ranked } = rankCardRecommendations(
      [candidate('1', 'Card A', 500, false, false), candidate('2', 'Card B', 490, false, true)],
      {
        engineVersion: 'v2',
        rankingContext: {
          amountInr: 10000,
          merchantPopularityScore: 90,
          preferences: { boostFavoriteCards: true },
        },
      },
    );

    expect(ranked[0]?.cardName).toBe('Card B');
    expect(ranked[0]?.scoreBreakdown?.preferenceBonusInr).toBeGreaterThan(0);
  });

  it('includes score breakdown and confidence on ranked cards', () => {
    const { ranked, engineVersion } = rankCardRecommendations([candidate('1', 'Card A', 500)], {
      engineVersion: 'v2',
      rankingContext: { amountInr: 10000 },
    });

    expect(engineVersion).toBe('v2');
    expect(ranked[0]?.confidenceScore).toBe(0.75);
    expect(ranked[0]?.scoreBreakdown?.compositeInr).toBeGreaterThan(0);
  });

  it('applies capped AI preference weight to preference bonus', () => {
    const evaluation = {
      estimatedValueInr: 100,
      confidenceScore: 0.8,
      cashbackInr: 100,
      rewardPoints: 0,
      milestoneBonusInr: 0,
      campaignApplied: false,
    };

    const withoutAi = computeRecommendationScore(
      evaluation,
      { isFavorite: true, bankSlug: 'hdfc' },
      {
        amountInr: 5000,
        preferences: { boostFavoriteCards: true },
        aiPreferenceWeight: 0,
      },
    );

    const withAi = computeRecommendationScore(
      evaluation,
      { isFavorite: true, bankSlug: 'hdfc' },
      {
        amountInr: 5000,
        preferences: { boostFavoriteCards: true },
        aiPreferenceWeight: 0.2,
      },
    );

    expect(withAi.preferenceBonusInr).toBeGreaterThan(withoutAi.preferenceBonusInr);
    expect(withAi.compositeInr).toBeGreaterThan(withoutAi.compositeInr);
  });
});
