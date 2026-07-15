import { z } from 'zod';

export const CalculateRewardSchema = z.object({
  cardId: z.string().uuid(),
  amount: z.number().positive(),
  merchantId: z.string().uuid().optional(),
  spendCategoryId: z.string().uuid().optional(),
  exclusionTags: z.array(z.string().min(1)).optional(),
  /** Spend in current milestone/cap period before this txn (M-026). */
  periodSpendInr: z.number().nonnegative().optional(),
  /** Rewards already earned in current cap period (M-026). */
  periodRewardsEarnedInr: z.number().nonnegative().optional(),
  at: z.string().datetime().optional(),
});

export type CalculateRewardInput = z.infer<typeof CalculateRewardSchema>;

export const PreviewRewardRuleSchema = z.object({
  /** Optional — preview runs on payload only (M-026). */
  creditCardId: z.string().uuid().optional(),
  amount: z.number().positive(),
  payload: z.record(z.string(), z.unknown()),
  pointValueInr: z.number().positive().optional(),
  spendCategoryId: z.string().uuid().optional().nullable(),
  merchantId: z.string().uuid().optional().nullable(),
  validFrom: z.string().datetime().optional().nullable(),
  validUntil: z.string().datetime().optional().nullable(),
  exclusionTags: z.array(z.string().min(1)).optional(),
  periodSpendInr: z.number().nonnegative().optional(),
  periodRewardsEarnedInr: z.number().nonnegative().optional(),
  at: z.string().datetime().optional(),
});

export type PreviewRewardRuleInput = z.infer<typeof PreviewRewardRuleSchema>;

export function parseCalculateRewardInput(input: unknown): CalculateRewardInput {
  return CalculateRewardSchema.parse(input);
}

export function parsePreviewRewardRuleInput(input: unknown): PreviewRewardRuleInput {
  return PreviewRewardRuleSchema.parse(input);
}
