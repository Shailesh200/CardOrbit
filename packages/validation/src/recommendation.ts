import { z } from 'zod';

import { RecommendationPreferenceOverridesSchema } from './recommendation-scoring';

const recommendationContextRefine = (value: {
  merchantId?: string;
  merchantSlug?: string;
  merchantAlias?: string;
  categorySlug?: string;
  spendCategoryId?: string;
}) =>
  Boolean(
    value.merchantId ||
    value.merchantSlug ||
    value.merchantAlias ||
    value.categorySlug ||
    value.spendCategoryId,
  );

const recommendationContextMessage =
  'At least one of merchantId, merchantSlug, merchantAlias, categorySlug, or spendCategoryId is required';

export const BestCardRecommendationBaseSchema = z.object({
  amount: z.number().positive(),
  merchantId: z.string().uuid().optional(),
  merchantSlug: z.string().min(1).optional(),
  merchantAlias: z.string().min(1).optional(),
  categorySlug: z.string().min(1).optional(),
  spendCategoryId: z.string().uuid().optional(),
  exclusionTags: z.array(z.string().min(1)).optional(),
  at: z.string().datetime().optional(),
  /** Period spend before this txn — feeds reward V2 caps/milestones (M-027). */
  periodSpendInr: z.number().nonnegative().optional(),
  /** Rewards already earned in current cap period (M-027). */
  periodRewardsEarnedInr: z.number().nonnegative().optional(),
  /** Request overrides; stored profile applied server-side when omitted (M-028). */
  preferences: RecommendationPreferenceOverridesSchema.optional(),
  /** Client surface that initiated the recommendation (M-033). */
  source: z.enum(['web', 'extension', 'dashboard']).optional(),
});

export const BestCardRecommendationSchema = BestCardRecommendationBaseSchema.refine(
  recommendationContextRefine,
  { message: recommendationContextMessage },
);

export type BestCardRecommendationInput = z.infer<typeof BestCardRecommendationSchema>;

export const AdminRecommendationAuditSchema = BestCardRecommendationBaseSchema.extend({
  userId: z.string().min(1),
}).refine(recommendationContextRefine, { message: recommendationContextMessage });

export type AdminRecommendationAuditInput = z.infer<typeof AdminRecommendationAuditSchema>;

export function parseBestCardRecommendationInput(input: unknown): BestCardRecommendationInput {
  return BestCardRecommendationSchema.parse(input);
}

export function parseAdminRecommendationAuditInput(input: unknown): AdminRecommendationAuditInput {
  return AdminRecommendationAuditSchema.parse(input);
}
