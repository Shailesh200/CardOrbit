import { z } from 'zod';

import { SpendBandSchema } from './onboarding';
import type { RecommendationPreferenceOverrides } from './recommendation-scoring';

export const PreferredRewardTypeSchema = z.enum([
  'cashback',
  'airline_miles',
  'hotel_points',
  'reward_points',
  'any',
]);

export const RewardPersonalizationProfileSchema = z.object({
  version: z.literal(2).default(2),
  preferredRewardType: PreferredRewardTypeSchema.default('any'),
  preferredBankSlugs: z.array(z.string().min(1)).default([]),
  preferredCategorySlugs: z.array(z.string().min(1)).default([]),
  boostFavoriteCards: z.boolean().default(true),
  preferredCurrency: z.string().length(3).default('INR'),
  spendBand: SpendBandSchema.optional(),
  categories: z.array(z.string().min(1)).optional(),
  updatedAt: z.string().datetime().optional(),
});

export type PreferredRewardType = z.infer<typeof PreferredRewardTypeSchema>;
export type RewardPersonalizationProfile = z.infer<typeof RewardPersonalizationProfileSchema>;

export const DEFAULT_REWARD_PERSONALIZATION: RewardPersonalizationProfile = {
  version: 2,
  preferredRewardType: 'any',
  preferredBankSlugs: [],
  preferredCategorySlugs: [],
  boostFavoriteCards: true,
  preferredCurrency: 'INR',
};

type LegacyPersonalizationStub = {
  version?: number;
  source?: string;
  spendBand?: string;
  categories?: string[];
  initializedAt?: string;
};

function migrateLegacyProfile(raw: LegacyPersonalizationStub): RewardPersonalizationProfile {
  return {
    ...DEFAULT_REWARD_PERSONALIZATION,
    spendBand: raw.spendBand as RewardPersonalizationProfile['spendBand'],
    categories: raw.categories,
    preferredCategorySlugs: raw.categories ?? [],
    updatedAt: raw.initializedAt,
  };
}

/** Parse stored personalization JSON (v2 or legacy onboarding stub). */
export function parseRewardPersonalizationProfile(input: unknown): RewardPersonalizationProfile {
  const raw =
    typeof input === 'object' && input !== null ? (input as LegacyPersonalizationStub) : {};

  if (raw.version === 1 || raw.source === 'onboarding_v1') {
    return migrateLegacyProfile(raw);
  }

  return RewardPersonalizationProfileSchema.parse({
    ...DEFAULT_REWARD_PERSONALIZATION,
    ...raw,
  });
}

export function mergeRewardPersonalizationProfile(
  current: unknown,
  patch: unknown,
): RewardPersonalizationProfile {
  const base = parseRewardPersonalizationProfile(current);
  const parsed = RewardPersonalizationProfileSchema.partial().parse(patch ?? {});
  return RewardPersonalizationProfileSchema.parse({
    ...base,
    ...parsed,
    updatedAt: new Date().toISOString(),
  });
}

/** Maps stored profile into M-027 recommendation ranking hints. */
export function toRecommendationPreferenceOverrides(
  profile: RewardPersonalizationProfile,
): RecommendationPreferenceOverrides {
  let preferredRewardType: RecommendationPreferenceOverrides['preferredRewardType'] = 'any';
  if (profile.preferredRewardType === 'cashback') {
    preferredRewardType = 'cashback';
  } else if (profile.preferredRewardType !== 'any') {
    preferredRewardType = 'points';
  }

  return {
    preferredBankSlugs:
      profile.preferredBankSlugs.length > 0 ? profile.preferredBankSlugs : undefined,
    boostFavoriteCards: profile.boostFavoriteCards,
    preferredRewardType,
  };
}
