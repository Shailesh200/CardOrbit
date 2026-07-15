import { describe, expect, it } from 'vitest';

import { applyRankingSignals, MAX_AI_PREFERENCE_WEIGHT } from './ranking-signals';

describe('applyRankingSignals', () => {
  it('returns base preferences when AI output is absent', () => {
    const result = applyRankingSignals(
      { preferredRewardType: 'cashback', boostFavoriteCards: true },
      null,
      ['hdfc', 'icici'],
    );
    expect(result.aiPreferenceWeight).toBe(0);
    expect(result.preferences.preferredRewardType).toBe('cashback');
  });

  it('filters AI bank slugs to portfolio banks only', () => {
    const result = applyRankingSignals(
      { preferredBankSlugs: ['hdfc'] },
      {
        preferredBankSlugs: ['hdfc', 'fake-bank'],
        preferenceWeight: 0.1,
      },
      ['hdfc', 'icici'],
    );
    expect(result.preferences.preferredBankSlugs).toEqual(['hdfc']);
    expect(result.aiPreferenceWeight).toBe(0.1);
  });

  it('caps preference weight at MAX_AI_PREFERENCE_WEIGHT', () => {
    const result = applyRankingSignals({}, { preferenceWeight: 0.9 }, []);
    expect(result.aiPreferenceWeight).toBe(MAX_AI_PREFERENCE_WEIGHT);
  });
});
