import { describe, expect, it } from 'vitest';

import { computeRecommendationScore } from './recommendation-scoring';

describe('computeRecommendationScore', () => {
  const baseEvaluation = {
    estimatedValueInr: 500,
    confidenceScore: 0.88,
    cashbackInr: 500,
    rewardPoints: 0,
    milestoneBonusInr: 0,
    campaignApplied: false,
  };

  it('combines reward, merchant, preference, and promotion components', () => {
    const score = computeRecommendationScore(
      { ...baseEvaluation, campaignApplied: true, milestoneBonusInr: 50 },
      { isFavorite: true, bankSlug: 'hdfc' },
      { amountInr: 10000, merchantPopularityScore: 100, preferences: { boostFavoriteCards: true } },
    );

    expect(score.rewardInr).toBe(500);
    expect(score.merchantBonusInr).toBeGreaterThan(0);
    expect(score.preferenceBonusInr).toBeGreaterThan(0);
    expect(score.promotionBonusInr).toBeGreaterThan(50);
    expect(score.compositeInr).toBeGreaterThan(score.rewardInr);
  });

  it('applies preferred bank bonus', () => {
    const score = computeRecommendationScore(
      baseEvaluation,
      { isFavorite: false, bankSlug: 'hdfc' },
      {
        amountInr: 5000,
        preferences: { preferredBankSlugs: ['hdfc'] },
      },
    );

    expect(score.preferenceBonusInr).toBeGreaterThan(0);
  });
});
