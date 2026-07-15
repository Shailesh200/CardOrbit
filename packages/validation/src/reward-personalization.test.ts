import { describe, expect, it } from 'vitest';

import {
  mergeRewardPersonalizationProfile,
  parseRewardPersonalizationProfile,
  toRecommendationPreferenceOverrides,
} from './reward-personalization';

describe('reward personalization (M-028)', () => {
  it('migrates legacy onboarding stub to v2 profile', () => {
    const profile = parseRewardPersonalizationProfile({
      version: 1,
      source: 'onboarding_v1',
      spendBand: '10K_50K',
      categories: ['dining', 'travel'],
    });

    expect(profile.version).toBe(2);
    expect(profile.spendBand).toBe('10K_50K');
    expect(profile.preferredCategorySlugs).toEqual(['dining', 'travel']);
  });

  it('merges partial updates with timestamp', () => {
    const merged = mergeRewardPersonalizationProfile(
      { preferredRewardType: 'any' },
      { preferredRewardType: 'cashback', preferredBankSlugs: ['hdfc'] },
    );

    expect(merged.preferredRewardType).toBe('cashback');
    expect(merged.preferredBankSlugs).toEqual(['hdfc']);
    expect(merged.updatedAt).toBeDefined();
  });

  it('maps profile to recommendation overrides', () => {
    const overrides = toRecommendationPreferenceOverrides({
      version: 2,
      preferredRewardType: 'airline_miles',
      preferredBankSlugs: ['axis'],
      preferredCategorySlugs: [],
      boostFavoriteCards: true,
      preferredCurrency: 'INR',
    });

    expect(overrides.preferredRewardType).toBe('points');
    expect(overrides.preferredBankSlugs).toEqual(['axis']);
  });
});
