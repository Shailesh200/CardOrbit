import { Inject, Injectable } from '@nestjs/common';
import { parseRewardRulePayload } from '@cardwise/validation';

import {
  MERCHANT_CATEGORY_REPOSITORY,
  MERCHANT_REPOSITORY,
  type MerchantCategoryRepository,
  type MerchantRepository,
} from '../../merchants/domain/repositories/merchant-catalog.repository';
import { calculateReward } from '../domain/services/reward-calculator';
import { mergeExclusionTags, tagsForSpendCategory } from '../domain/services/exclusion-tags';
import { filterApplicableRules } from '../domain/services/rule-matcher';
import type {
  RewardEvaluationContext,
  RewardEvaluationResult,
  RewardRuleEvaluator,
} from '../domain/ports/reward-rule-evaluator.port';
import {
  REWARD_RULE_REPOSITORY,
  type RewardRuleRepository,
} from '../domain/repositories/reward-rule.repository';

@Injectable()
export class RewardRuleEvaluatorService implements RewardRuleEvaluator {
  constructor(
    @Inject(REWARD_RULE_REPOSITORY) private readonly rules: RewardRuleRepository,
    @Inject(MERCHANT_REPOSITORY) private readonly merchants: MerchantRepository,
    @Inject(MERCHANT_CATEGORY_REPOSITORY)
    private readonly merchantCategories: MerchantCategoryRepository,
  ) {}

  async evaluate(context: RewardEvaluationContext): Promise<RewardEvaluationResult | null> {
    const at = context.at ?? new Date();
    const spendContext = await this.resolveSpendContext(context);
    const activeRules = await this.rules.listActiveForCard(context.creditCardId);
    const applicable = filterApplicableRules(activeRules, {
      merchantId: context.merchantId,
      spendCategoryId: spendContext.spendCategoryId,
      at,
    });

    let best: RewardEvaluationResult | null = null;
    let bestExcluded: RewardEvaluationResult | null = null;

    for (const entry of applicable) {
      const payload = parseRewardRulePayload(entry.activeVersion.payload);
      const calculated = calculateReward({
        amountInr: context.amountInr,
        payload,
        pointValueInr: entry.pointValueInr ?? 0,
        exclusionTags: spendContext.exclusionTags,
        at,
        validFrom: entry.activeVersion.validFrom,
        validUntil: entry.activeVersion.validUntil,
        periodSpendInr: context.periodSpendInr ?? 0,
        periodRewardsEarnedInr: context.periodRewardsEarnedInr ?? 0,
      });

      if (!calculated) {
        continue;
      }

      if (calculated.excluded) {
        const excludedResult = this.toEvaluationResult(entry, calculated);
        bestExcluded ??= excludedResult;
        continue;
      }

      const candidate = this.toEvaluationResult(entry, calculated);
      if (!best || candidate.estimatedValueInr > best.estimatedValueInr) {
        best = candidate;
      }
    }

    return best ?? bestExcluded;
  }

  private toEvaluationResult(
    entry: Awaited<ReturnType<RewardRuleRepository['listActiveForCard']>>[number],
    calculated: NonNullable<ReturnType<typeof calculateReward>>,
  ): RewardEvaluationResult {
    const hasCategoryScope = Boolean(entry.activeVersion.spendCategoryId);
    const hasMerchantScope = Boolean(entry.activeVersion.merchantId);
    let confidenceScore = calculated.confidenceScore;
    if (hasCategoryScope) confidenceScore = Math.min(1, confidenceScore + 0.12);
    if (hasMerchantScope) confidenceScore = Math.min(1, confidenceScore + 0.13);

    return {
      ruleKey: entry.rule.ruleKey,
      ruleName: entry.rule.name,
      versionNumber: entry.activeVersion.versionNumber,
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
      confidenceScore,
      campaignApplied: calculated.campaignApplied,
      milestoneCrossed: calculated.milestoneCrossed,
    };
  }

  private async resolveSpendContext(context: RewardEvaluationContext): Promise<{
    spendCategoryId: string | null;
    exclusionTags: string[];
  }> {
    let spendCategoryId = context.spendCategoryId ?? null;
    const categories = await this.merchantCategories.listActive();
    const categoryById = new Map(categories.map((category) => [category.id, category]));

    const tagGroups: string[][] = [];
    if (context.exclusionTags?.length) {
      tagGroups.push(context.exclusionTags);
    }

    if (context.merchantId) {
      const merchant = await this.merchants.findById(context.merchantId);
      if (merchant?.primaryCategoryId) {
        spendCategoryId = spendCategoryId ?? merchant.primaryCategoryId;
        const category = categoryById.get(merchant.primaryCategoryId);
        if (category) {
          tagGroups.push(tagsForSpendCategory(category.code, category.slug));
        }
      }
    }

    if (spendCategoryId) {
      const category = categoryById.get(spendCategoryId);
      if (category) {
        tagGroups.push(tagsForSpendCategory(category.code, category.slug));
      }
    }

    return {
      spendCategoryId,
      exclusionTags: mergeExclusionTags(...tagGroups),
    };
  }
}
