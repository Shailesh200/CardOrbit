import { z } from 'zod';

import type { RecommendationPreferenceOverrides } from '../recommendation-scoring';

export const MAX_AI_PREFERENCE_WEIGHT = 0.25;

export const RankingSignalsOutputSchema = z.object({
  preferredBankSlugs: z.array(z.string().min(1)).max(3).optional(),
  boostFavoriteCards: z.boolean().optional(),
  preferredRewardType: z.enum(['cashback', 'points', 'any']).optional(),
  preferenceWeight: z.number().min(0).max(MAX_AI_PREFERENCE_WEIGHT).default(0),
});

export type RankingSignalsOutput = z.infer<typeof RankingSignalsOutputSchema>;

export const RankingSignalsContextSchema = z.object({
  preferredRewardType: z.string(),
  preferredBankSlugs: z.array(z.string()),
  preferredCategorySlugs: z.array(z.string()),
  boostFavoriteCards: z.boolean(),
  portfolioBankSlugs: z.array(z.string()),
  favoriteCount: z.number().int().nonnegative(),
  portfolioCount: z.number().int().nonnegative(),
  request: z.object({
    merchantSlug: z.string().optional(),
    categorySlug: z.string(),
    amountInr: z.number(),
  }),
});

export type RankingSignalsContext = z.infer<typeof RankingSignalsContextSchema>;

export type AppliedRankingSignals = {
  preferences: RecommendationPreferenceOverrides;
  aiPreferenceWeight: number;
};

/** Merge grounded AI signals into profile preferences with hard caps. */
export function applyRankingSignals(
  base: RecommendationPreferenceOverrides,
  ai: RankingSignalsOutput | null | undefined,
  allowedBankSlugs: string[],
): AppliedRankingSignals {
  if (!ai) {
    return { preferences: base, aiPreferenceWeight: 0 };
  }

  const merged: RecommendationPreferenceOverrides = { ...base };

  if (ai.preferredBankSlugs?.length) {
    const allowed = new Set(allowedBankSlugs);
    const valid = ai.preferredBankSlugs.filter((slug) => allowed.has(slug));
    if (valid.length > 0) {
      merged.preferredBankSlugs = [
        ...new Set([...(base.preferredBankSlugs ?? []), ...valid]),
      ].slice(0, 3);
    }
  }

  if (ai.boostFavoriteCards !== undefined) {
    merged.boostFavoriteCards = ai.boostFavoriteCards;
  }

  if (ai.preferredRewardType && ai.preferredRewardType !== 'any') {
    merged.preferredRewardType = ai.preferredRewardType;
  }

  const aiPreferenceWeight = Math.min(
    MAX_AI_PREFERENCE_WEIGHT,
    Math.max(0, ai.preferenceWeight ?? 0),
  );

  return { preferences: merged, aiPreferenceWeight };
}
