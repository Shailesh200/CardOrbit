import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  parseCalculateRewardInput,
  parsePreviewRewardRuleInput,
  parseRewardRulePayload,
} from '@cardwise/validation';

import {
  REWARD_RULE_EVALUATOR,
  type RewardEvaluationResult,
  type RewardRuleEvaluator,
} from '../../domain/ports/reward-rule-evaluator.port';
import { calculateReward } from '../../domain/services/reward-calculator';
import { mergeExclusionTags } from '../../domain/services/exclusion-tags';

@Injectable()
export class CalculateRewardQuery {
  constructor(@Inject(REWARD_RULE_EVALUATOR) private readonly evaluator: RewardRuleEvaluator) {}

  async execute(input: unknown): Promise<RewardEvaluationResult | null> {
    const parsed = parseCalculateRewardInput(input);
    return this.evaluator.evaluate({
      creditCardId: parsed.cardId,
      amountInr: parsed.amount,
      merchantId: parsed.merchantId,
      spendCategoryId: parsed.spendCategoryId,
      exclusionTags: parsed.exclusionTags,
      periodSpendInr: parsed.periodSpendInr,
      periodRewardsEarnedInr: parsed.periodRewardsEarnedInr,
      at: parsed.at ? new Date(parsed.at) : undefined,
    });
  }
}

@Injectable()
export class PreviewRewardRuleQuery {
  execute(input: unknown): RewardEvaluationResult {
    const parsed = parsePreviewRewardRuleInput(input);
    const payload = parseRewardRulePayload(parsed.payload);
    const at = parsed.at ? new Date(parsed.at) : new Date();

    const calculated = calculateReward({
      amountInr: parsed.amount,
      payload,
      pointValueInr: parsed.pointValueInr ?? 0.25,
      exclusionTags: mergeExclusionTags(parsed.exclusionTags),
      at,
      validFrom: parsed.validFrom ? new Date(parsed.validFrom) : null,
      validUntil: parsed.validUntil ? new Date(parsed.validUntil) : null,
      periodSpendInr: parsed.periodSpendInr ?? 0,
      periodRewardsEarnedInr: parsed.periodRewardsEarnedInr ?? 0,
    });

    if (!calculated) {
      throw new NotFoundException('Rule is not valid for the given transaction date');
    }

    return {
      ruleKey: 'preview',
      ruleName: 'Preview',
      versionNumber: 0,
      estimatedValueInr: calculated.estimatedValueInr,
      estimatedRedemptionValueInr: calculated.estimatedRedemptionValueInr,
      rewardPoints: calculated.rewardPoints,
      cashbackInr: calculated.cashbackInr,
      effectiveRatePercent: calculated.effectiveRatePercent,
      multiplier: calculated.multiplier,
      cashbackPercent: calculated.cashbackPercent,
      milestoneBonusInr: calculated.milestoneBonusInr,
      capped: calculated.capped,
      capAppliedInr: calculated.capAppliedInr,
      periodCapRemainingInr: calculated.periodCapRemainingInr,
      excluded: calculated.excluded,
      exclusionReason: calculated.exclusionReason,
      benefitsApplied: calculated.benefitsApplied,
      explanation: calculated.explanation,
      confidenceScore: calculated.confidenceScore,
      campaignApplied: calculated.campaignApplied,
      milestoneCrossed: calculated.milestoneCrossed,
    };
  }
}
