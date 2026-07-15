/**
 * Port for deterministic reward calculation (ADR-026).
 * Implemented in M-017 — RewardRuleEvaluatorService.
 */
export const REWARD_RULE_EVALUATOR = Symbol('REWARD_RULE_EVALUATOR');

export type RewardEvaluationContext = {
  creditCardId: string;
  amountInr: number;
  spendCategoryId?: string | null;
  merchantId?: string | null;
  exclusionTags?: string[];
  periodSpendInr?: number;
  periodRewardsEarnedInr?: number;
  at?: Date;
};

export type RewardEvaluationResult = {
  ruleKey: string;
  ruleName: string;
  versionNumber: number;
  estimatedValueInr: number;
  estimatedRedemptionValueInr: number;
  rewardPoints: number;
  cashbackInr: number;
  effectiveRatePercent: number;
  multiplier?: number;
  cashbackPercent?: number;
  milestoneBonusInr: number;
  capped: boolean;
  capAppliedInr?: number;
  periodCapRemainingInr?: number;
  excluded: boolean;
  exclusionReason?: string;
  benefitsApplied: string[];
  explanation: string;
  confidenceScore: number;
  campaignApplied: boolean;
  milestoneCrossed: boolean;
};

export interface RewardRuleEvaluator {
  evaluate(context: RewardEvaluationContext): Promise<RewardEvaluationResult | null>;
}
