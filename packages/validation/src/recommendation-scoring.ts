import { z } from 'zod';

/** Ranking preference hints — populated from user profile (M-028) or request overrides. */
export const RecommendationPreferenceOverridesSchema = z.object({
  preferredBankSlugs: z.array(z.string().min(1)).optional(),
  boostFavoriteCards: z.boolean().optional(),
  preferredRewardType: z.enum(['cashback', 'points', 'any']).optional(),
});

export type RecommendationPreferenceOverrides = z.infer<
  typeof RecommendationPreferenceOverridesSchema
>;

export type RecommendationScoreBreakdown = {
  rewardInr: number;
  merchantBonusInr: number;
  preferenceBonusInr: number;
  promotionBonusInr: number;
  /** V3 — projected milestone unlock value credited to this spend. */
  strategicMilestoneBonusInr: number;
  /** V3 — near-term expiring reward nudge. */
  strategicExpiryBonusInr: number;
  /** V3 — travel-category affinity. */
  strategicTravelBonusInr: number;
  compositeInr: number;
};

export type RecommendationStrategicCardSignal = {
  milestoneProgressPercent?: number;
  milestoneRemainingInr?: number;
  milestoneBonusValueInr?: number;
  milestoneLabel?: string | null;
  expiringRewardsInr?: number;
  travelAffinityScore?: number;
};

export type RecommendationRankingContext = {
  amountInr: number;
  merchantPopularityScore?: number;
  preferences?: RecommendationPreferenceOverrides;
  /** Capped AI nudge on preference bonus (0–0.25). */
  aiPreferenceWeight?: number;
  /** V3 — travel/category awareness for strategic travel bonus. */
  isTravelCategory?: boolean;
  /** V3 — per-userCardId strategic signals (milestones, expiry, travel). */
  strategicSignalsByUserCardId?: Record<string, RecommendationStrategicCardSignal>;
};

function roundInr(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Minimal evaluation shape for scoring (shared by API ranker). */
export type RecommendationEvaluationSignals = {
  estimatedValueInr: number;
  confidenceScore: number;
  cashbackInr: number;
  rewardPoints: number;
  milestoneBonusInr: number;
  campaignApplied: boolean;
};

/**
 * Deterministic V2 composite score:
 * Reward Value + Merchant Bonus + User Preference + Promotion Score.
 */
export function computeRecommendationScore(
  evaluation: RecommendationEvaluationSignals,
  candidate: { isFavorite: boolean; bankSlug: string },
  context: RecommendationRankingContext,
): RecommendationScoreBreakdown {
  const rewardInr = evaluation.estimatedValueInr;

  const confidenceLift = Math.max(0, evaluation.confidenceScore - 0.65);
  const popularityFactor = (context.merchantPopularityScore ?? 50) / 100;
  const merchantBonusInr = roundInr(context.amountInr * 0.001 * confidenceLift * popularityFactor);

  const prefs = context.preferences;
  let preferenceBonusInr = 0;
  if (prefs?.boostFavoriteCards !== false && candidate.isFavorite) {
    preferenceBonusInr += Math.min(50, rewardInr * 0.05);
  }
  if (prefs?.preferredBankSlugs?.includes(candidate.bankSlug)) {
    preferenceBonusInr += Math.min(30, rewardInr * 0.03);
  }
  if (prefs?.preferredRewardType === 'cashback' && evaluation.cashbackInr > 0) {
    preferenceBonusInr += Math.min(20, rewardInr * 0.02);
  } else if (prefs?.preferredRewardType === 'points' && evaluation.rewardPoints > 0) {
    preferenceBonusInr += Math.min(20, rewardInr * 0.02);
  }
  preferenceBonusInr = roundInr(preferenceBonusInr);

  const aiWeight = Math.min(0.25, Math.max(0, context.aiPreferenceWeight ?? 0));
  if (aiWeight > 0 && preferenceBonusInr > 0) {
    preferenceBonusInr = roundInr(preferenceBonusInr * (1 + aiWeight));
  }

  const campaignBonus = evaluation.campaignApplied ? Math.min(100, rewardInr * 0.04) : 0;
  const promotionBonusInr = roundInr(evaluation.milestoneBonusInr + campaignBonus);

  const compositeInr = roundInr(
    rewardInr + merchantBonusInr + preferenceBonusInr + promotionBonusInr,
  );

  return {
    rewardInr,
    merchantBonusInr,
    preferenceBonusInr,
    promotionBonusInr,
    strategicMilestoneBonusInr: 0,
    strategicExpiryBonusInr: 0,
    strategicTravelBonusInr: 0,
    compositeInr,
  };
}
