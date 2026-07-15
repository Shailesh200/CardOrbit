import type { RewardRulePayload } from '@cardwise/validation';
import { isQuarterActive } from '@cardwise/validation';

import { isExcluded } from './exclusion-tags';

export type RewardCalculationInput = {
  amountInr: number;
  payload: RewardRulePayload;
  pointValueInr: number;
  exclusionTags: string[];
  at: Date;
  validFrom?: Date | null;
  validUntil?: Date | null;
  periodSpendInr?: number;
  periodRewardsEarnedInr?: number;
};

export type RewardCalculationResult = {
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

const DEFAULT_POINT_VALUE_INR = 0.25;

export function roundInr(value: number): number {
  return Math.round(value * 100) / 100;
}

function isWithinValidity(
  validFrom: Date | null | undefined,
  validUntil: Date | null | undefined,
  at: Date,
): boolean {
  if (validFrom && at < validFrom) {
    return false;
  }
  if (validUntil && at > validUntil) {
    return false;
  }
  return true;
}

function applyTransactionCaps(
  valueInr: number,
  payload: RewardRulePayload,
): { valueInr: number; capped: boolean; capAppliedInr?: number } {
  let cappedValue = valueInr;
  let capped = false;
  let capAppliedInr: number | undefined;

  const limits = [payload.perTransactionCap, payload.cap, payload.monthlyLimit].filter(
    (limit): limit is number => limit !== undefined,
  );

  for (const limit of limits) {
    if (cappedValue > limit) {
      cappedValue = limit;
      capped = true;
      capAppliedInr = limit;
    }
  }

  return { valueInr: roundInr(cappedValue), capped, capAppliedInr };
}

function applyPeriodCap(
  valueInr: number,
  payload: RewardRulePayload,
  periodRewardsEarnedInr: number,
): {
  valueInr: number;
  capped: boolean;
  capAppliedInr?: number;
  periodCapRemainingInr?: number;
} {
  const capPeriod = payload.capPeriod ?? 'transaction';
  const periodCapInr = payload.periodCapInr;

  if (capPeriod === 'transaction' || periodCapInr === undefined) {
    return applyTransactionCaps(valueInr, payload);
  }

  const remaining = Math.max(0, periodCapInr - periodRewardsEarnedInr);
  if (remaining <= 0) {
    return {
      valueInr: 0,
      capped: true,
      capAppliedInr: 0,
      periodCapRemainingInr: 0,
    };
  }

  if (valueInr > remaining) {
    return {
      valueInr: roundInr(remaining),
      capped: true,
      capAppliedInr: roundInr(remaining),
      periodCapRemainingInr: 0,
    };
  }

  return {
    valueInr: roundInr(valueInr),
    capped: false,
    periodCapRemainingInr: roundInr(remaining - valueInr),
  };
}

function resolveMilestoneBonus(
  payload: RewardRulePayload,
  amountInr: number,
  periodSpendInr: number,
): { bonusInr: number; crossed: boolean } {
  if (payload.milestoneBonus === undefined || payload.spendThreshold === undefined) {
    return { bonusInr: 0, crossed: false };
  }

  const mode = payload.milestoneMode ?? 'single_transaction';
  if (mode === 'single_transaction') {
    const crossed = amountInr >= payload.spendThreshold;
    return {
      bonusInr: crossed ? payload.milestoneBonus : 0,
      crossed,
    };
  }

  const crossed =
    periodSpendInr < payload.spendThreshold && periodSpendInr + amountInr >= payload.spendThreshold;
  return {
    bonusInr: crossed ? payload.milestoneBonus : 0,
    crossed,
  };
}

function computeConfidenceScore(input: {
  capped: boolean;
  campaignApplied: boolean;
  hasCategoryScope: boolean;
  hasMerchantScope: boolean;
}): number {
  let score = 0.65;
  if (input.hasCategoryScope) score += 0.12;
  if (input.hasMerchantScope) score += 0.13;
  if (input.campaignApplied) score += 0.05;
  if (!input.capped) score += 0.05;
  return Math.min(1, roundInr(score));
}

/** Deterministic reward calculation — no DB or hardcoded issuer rates. */
export function calculateReward(input: RewardCalculationInput): RewardCalculationResult | null {
  const {
    amountInr,
    payload,
    pointValueInr,
    exclusionTags,
    at,
    validFrom,
    validUntil,
    periodSpendInr = 0,
    periodRewardsEarnedInr = 0,
  } = input;

  if (!isWithinValidity(validFrom, validUntil, at)) {
    return null;
  }

  const exclusion = isExcluded(exclusionTags, payload.exclusions ?? []);
  if (exclusion.excluded) {
    return {
      estimatedValueInr: 0,
      estimatedRedemptionValueInr: 0,
      rewardPoints: 0,
      cashbackInr: 0,
      effectiveRatePercent: 0,
      milestoneBonusInr: 0,
      capped: false,
      excluded: true,
      exclusionReason: `Spend category "${exclusion.matchedTag}" is excluded by this rule`,
      benefitsApplied: [],
      explanation: `No reward — "${exclusion.matchedTag}" is excluded for this card rule.`,
      confidenceScore: 0.9,
      campaignApplied: false,
      milestoneCrossed: false,
    };
  }

  const campaign = payload.quarterlyCampaign;
  const campaignApplied = Boolean(campaign && isQuarterActive(at, campaign.activeQuarters));

  const benefitsApplied: string[] = [];
  let rewardPoints = 0;
  let cashbackInr = 0;

  let multiplier = payload.rewardMultiplier;
  if (multiplier !== undefined) {
    if (campaignApplied && campaign?.multiplierBoost) {
      multiplier += campaign.multiplierBoost;
      benefitsApplied.push(
        `Q${Math.floor(at.getUTCMonth() / 3) + 1} campaign +${campaign.multiplierBoost}x`,
      );
    }
    rewardPoints = Math.floor(amountInr / 100) * multiplier;
    benefitsApplied.push(`${multiplier}x reward points`);
  }

  let cashbackPercent = payload.cashbackPercent;
  if (cashbackPercent !== undefined) {
    if (campaignApplied && campaign?.cashbackBoostPercent) {
      cashbackPercent = Math.min(100, cashbackPercent + campaign.cashbackBoostPercent);
      benefitsApplied.push(
        `Q${Math.floor(at.getUTCMonth() / 3) + 1} +${campaign.cashbackBoostPercent}% cashback boost`,
      );
    }
    cashbackInr = roundInr((amountInr * cashbackPercent) / 100);
    benefitsApplied.push(`${cashbackPercent}% cashback`);
  }

  const { bonusInr: milestoneBonusInr, crossed: milestoneCrossed } = resolveMilestoneBonus(
    payload,
    amountInr,
    periodSpendInr,
  );
  if (milestoneBonusInr > 0) {
    const mode = payload.milestoneMode ?? 'single_transaction';
    benefitsApplied.push(
      mode === 'cumulative'
        ? `₹${milestoneBonusInr} cumulative milestone bonus`
        : `₹${milestoneBonusInr} milestone bonus`,
    );
  }

  const pointValue = pointValueInr > 0 ? pointValueInr : DEFAULT_POINT_VALUE_INR;
  const pointsValueInr = roundInr(rewardPoints * pointValue);
  const rawValueInr = roundInr(pointsValueInr + cashbackInr + milestoneBonusInr);

  const { valueInr, capped, capAppliedInr, periodCapRemainingInr } = applyPeriodCap(
    rawValueInr,
    payload,
    periodRewardsEarnedInr,
  );

  const effectiveRatePercent = amountInr > 0 ? roundInr((valueInr / amountInr) * 100) : 0;

  const explanationParts: string[] = [];
  if (rewardPoints > 0) {
    explanationParts.push(`${rewardPoints} points (₹${pointsValueInr} at ₹${pointValue}/point)`);
  }
  if (cashbackInr > 0) {
    explanationParts.push(`₹${cashbackInr} cashback`);
  }
  if (milestoneBonusInr > 0) {
    explanationParts.push(`₹${milestoneBonusInr} milestone bonus`);
  }
  if (capped && capAppliedInr !== undefined) {
    explanationParts.push(`capped at ₹${capAppliedInr}`);
  }
  if (
    periodCapRemainingInr !== undefined &&
    payload.capPeriod &&
    payload.capPeriod !== 'transaction'
  ) {
    explanationParts.push(`₹${periodCapRemainingInr} left in ${payload.capPeriod} cap`);
  }

  const explanation =
    explanationParts.length > 0
      ? `Estimated reward: ${explanationParts.join(' + ')} (${effectiveRatePercent}% effective rate)`
      : 'No reward earned for this transaction';

  return {
    estimatedValueInr: valueInr,
    estimatedRedemptionValueInr: valueInr,
    rewardPoints,
    cashbackInr,
    effectiveRatePercent,
    multiplier,
    cashbackPercent,
    milestoneBonusInr,
    capped,
    capAppliedInr,
    periodCapRemainingInr,
    excluded: false,
    benefitsApplied,
    explanation,
    confidenceScore: computeConfidenceScore({
      capped,
      campaignApplied,
      hasCategoryScope: false,
      hasMerchantScope: false,
    }),
    campaignApplied,
    milestoneCrossed,
  };
}
