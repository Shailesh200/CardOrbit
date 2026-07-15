import { z } from 'zod';

const QuarterlyCampaignSchema = z.object({
  /** Added to base rewardMultiplier when campaign is active. */
  multiplierBoost: z.number().nonnegative().optional(),
  /** Added to base cashbackPercent when campaign is active. */
  cashbackBoostPercent: z.number().min(0).max(100).optional(),
  /** Quarters 1–4 when boost applies; omit for all quarters. */
  activeQuarters: z.array(z.number().int().min(1).max(4)).optional(),
});

/**
 * Economics payload stored on reward_rule_versions.payload.
 * Shared by seed (M-010), admin CMS (M-011), and reward engine (M-017 / M-026).
 */
export const RewardRulePayloadSchema = z
  .object({
    rewardMultiplier: z.number().positive().optional(),
    cashbackPercent: z.number().min(0).max(100).optional(),
    /** Legacy per-transaction INR cap (V1). */
    cap: z.number().nonnegative().optional(),
    perTransactionCap: z.number().nonnegative().optional(),
    /** Legacy alias — treated as per-transaction cap unless capPeriod + periodCapInr set. */
    monthlyLimit: z.number().nonnegative().optional(),
    /** Rolling cap window for periodCapInr (M-026). */
    capPeriod: z.enum(['transaction', 'monthly', 'quarterly', 'annual']).optional(),
    /** Max reward INR earned in capPeriod before this transaction. */
    periodCapInr: z.number().nonnegative().optional(),
    spendThreshold: z.number().nonnegative().optional(),
    milestoneBonus: z.number().nonnegative().optional(),
    /** single_transaction (V1 default) or cumulative period spend (M-026). */
    milestoneMode: z.enum(['single_transaction', 'cumulative']).optional(),
    milestonePeriod: z.enum(['monthly', 'quarterly', 'annual']).optional(),
    quarterlyCampaign: QuarterlyCampaignSchema.optional(),
    exclusions: z.array(z.string().min(1)).default([]),
  })
  .refine(
    (value) =>
      value.rewardMultiplier !== undefined ||
      value.cashbackPercent !== undefined ||
      value.milestoneBonus !== undefined,
    {
      message: 'At least one of rewardMultiplier, cashbackPercent, or milestoneBonus is required',
    },
  );

export type RewardRulePayload = z.infer<typeof RewardRulePayloadSchema>;
export type QuarterlyCampaign = z.infer<typeof QuarterlyCampaignSchema>;

export function parseRewardRulePayload(input: unknown): RewardRulePayload {
  return RewardRulePayloadSchema.parse(input);
}

export function safeParseRewardRulePayload(input: unknown) {
  return RewardRulePayloadSchema.safeParse(input);
}
