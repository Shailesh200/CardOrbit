import type {
  RecommendationRankingContext,
  RecommendationScoreBreakdown,
} from '@cardwise/validation';
import { computeRecommendationScore } from '@cardwise/validation';

import type { RewardEvaluationResult } from '../../../rewards/domain/ports/reward-rule-evaluator.port';
import {
  applyStrategicBonuses,
  buildStrategicRationale,
  computeStrategicScoreParts,
  type StrategicCardSignal,
} from './strategic-ranking';

export type RecommendationEngineVersion = 'v1' | 'v2' | 'v3';

export type CardEvaluationCandidate = {
  userCardId: string;
  creditCardId: string;
  cardName: string;
  bankName: string;
  bankSlug: string;
  cardSlug: string;
  isFavorite?: boolean;
  evaluation: RewardEvaluationResult | null;
};

export type RankedCardRecommendation = {
  userCardId: string;
  creditCardId: string;
  cardName: string;
  bankName: string;
  bankSlug: string;
  cardSlug: string;
  rank: number;
  score: number;
  expectedRewardInr: number;
  effectiveRatePercent: number;
  explanation: string;
  ruleKey: string | null;
  ruleName: string | null;
  excluded: boolean;
  benefitsApplied: string[];
  confidenceScore: number;
  campaignApplied: boolean;
  milestoneCrossed: boolean;
  compositeScoreInr: number;
  scoreBreakdown: RecommendationScoreBreakdown | null;
  strategicRationale: string | null;
};

export type RecommendationAuditEntry = RankedCardRecommendation & {
  eligible: boolean;
  exclusionReason?: string;
};

export type RankRecommendationsOptions = {
  engineVersion?: RecommendationEngineVersion;
  rankingContext?: RecommendationRankingContext;
};

function isEligible(
  evaluation: RewardEvaluationResult | null,
): evaluation is RewardEvaluationResult {
  return Boolean(evaluation && !evaluation.excluded && evaluation.estimatedValueInr > 0);
}

function toStrategicSignal(
  context: RecommendationRankingContext | undefined,
  userCardId: string,
): StrategicCardSignal | undefined {
  const raw = context?.strategicSignalsByUserCardId?.[userCardId];
  if (!raw) return undefined;
  return {
    userCardId,
    milestoneProgressPercent: raw.milestoneProgressPercent ?? 0,
    milestoneRemainingInr: raw.milestoneRemainingInr ?? 0,
    milestoneBonusValueInr: raw.milestoneBonusValueInr ?? 0,
    milestoneLabel: raw.milestoneLabel ?? null,
    expiringRewardsInr: raw.expiringRewardsInr ?? 0,
    travelAffinityScore: raw.travelAffinityScore ?? 0,
  };
}

function buildV2Breakdown(
  evaluation: RewardEvaluationResult,
  candidate: CardEvaluationCandidate,
  rankingContext: RecommendationRankingContext,
): RecommendationScoreBreakdown {
  return computeRecommendationScore(
    evaluation,
    { isFavorite: candidate.isFavorite ?? false, bankSlug: candidate.bankSlug },
    rankingContext,
  );
}

function buildScoreBreakdown(
  evaluation: RewardEvaluationResult,
  candidate: CardEvaluationCandidate,
  engineVersion: RecommendationEngineVersion,
  rankingContext: RecommendationRankingContext | undefined,
): RecommendationScoreBreakdown | null {
  if (engineVersion === 'v1' || !rankingContext) {
    return null;
  }

  const base = buildV2Breakdown(evaluation, candidate, rankingContext);
  if (engineVersion !== 'v3') {
    return base;
  }

  const signal = toStrategicSignal(rankingContext, candidate.userCardId);
  const parts = computeStrategicScoreParts(
    signal,
    rankingContext.amountInr,
    rankingContext.isTravelCategory ?? false,
  );
  return applyStrategicBonuses(base, parts);
}

function sortValue(
  evaluation: RewardEvaluationResult,
  candidate: CardEvaluationCandidate,
  engineVersion: RecommendationEngineVersion,
  rankingContext: RecommendationRankingContext | undefined,
): number {
  if (engineVersion === 'v1' || !rankingContext) {
    return evaluation.estimatedValueInr;
  }

  return (
    buildScoreBreakdown(evaluation, candidate, engineVersion, rankingContext)?.compositeInr ??
    evaluation.estimatedValueInr
  );
}

/** Deterministic ranking — V1 reward INR; V2 contextual composite; V3 + strategic signals. */
export function rankCardRecommendations(
  candidates: CardEvaluationCandidate[],
  options: RankRecommendationsOptions = {},
): {
  ranked: RankedCardRecommendation[];
  audit: RecommendationAuditEntry[];
  engineVersion: RecommendationEngineVersion;
} {
  const engineVersion = options.engineVersion ?? 'v1';
  const rankingContext = options.rankingContext;

  const audit: RecommendationAuditEntry[] = candidates.map((candidate) => {
    const evaluation = candidate.evaluation;
    const eligible = isEligible(evaluation);
    const breakdown =
      evaluation && eligible
        ? buildScoreBreakdown(evaluation, candidate, engineVersion, rankingContext)
        : null;
    const signal = toStrategicSignal(rankingContext, candidate.userCardId);
    const parts =
      engineVersion === 'v3' && rankingContext
        ? computeStrategicScoreParts(
            signal,
            rankingContext.amountInr,
            rankingContext.isTravelCategory ?? false,
          )
        : null;

    return {
      userCardId: candidate.userCardId,
      creditCardId: candidate.creditCardId,
      cardName: candidate.cardName,
      bankName: candidate.bankName,
      bankSlug: candidate.bankSlug,
      cardSlug: candidate.cardSlug,
      rank: 0,
      score: 0,
      expectedRewardInr: evaluation?.estimatedValueInr ?? 0,
      effectiveRatePercent: evaluation?.effectiveRatePercent ?? 0,
      explanation: evaluation?.explanation ?? 'No applicable reward rule for this transaction',
      ruleKey: evaluation?.ruleKey ?? null,
      ruleName: evaluation?.ruleName ?? null,
      excluded: evaluation?.excluded ?? false,
      benefitsApplied: evaluation?.benefitsApplied ?? [],
      confidenceScore: evaluation?.confidenceScore ?? 0,
      campaignApplied: evaluation?.campaignApplied ?? false,
      milestoneCrossed: evaluation?.milestoneCrossed ?? false,
      compositeScoreInr: breakdown?.compositeInr ?? evaluation?.estimatedValueInr ?? 0,
      scoreBreakdown: breakdown,
      strategicRationale:
        parts && evaluation
          ? buildStrategicRationale(signal, parts, evaluation.estimatedValueInr)
          : null,
      eligible,
      exclusionReason: evaluation?.exclusionReason,
    };
  });

  const eligible = candidates
    .filter((candidate) => isEligible(candidate.evaluation))
    .sort((left, right) => {
      const leftValue = sortValue(left.evaluation!, left, engineVersion, rankingContext);
      const rightValue = sortValue(right.evaluation!, right, engineVersion, rankingContext);
      return rightValue - leftValue || left.cardName.localeCompare(right.cardName);
    });

  const bestValue =
    eligible[0] && isEligible(eligible[0].evaluation)
      ? sortValue(eligible[0].evaluation, eligible[0], engineVersion, rankingContext)
      : 0;

  const ranked: RankedCardRecommendation[] = eligible.map((candidate, index) => {
    const evaluation = candidate.evaluation!;
    const breakdown = buildScoreBreakdown(evaluation, candidate, engineVersion, rankingContext) ?? {
      rewardInr: evaluation.estimatedValueInr,
      merchantBonusInr: 0,
      preferenceBonusInr: 0,
      promotionBonusInr: 0,
      strategicMilestoneBonusInr: 0,
      strategicExpiryBonusInr: 0,
      strategicTravelBonusInr: 0,
      compositeInr: evaluation.estimatedValueInr,
    };
    const sortKey = sortValue(evaluation, candidate, engineVersion, rankingContext);
    const score = bestValue > 0 ? Math.round((sortKey / bestValue) * 100) : 0;
    const signal = toStrategicSignal(rankingContext, candidate.userCardId);
    const parts =
      engineVersion === 'v3' && rankingContext
        ? computeStrategicScoreParts(
            signal,
            rankingContext.amountInr,
            rankingContext.isTravelCategory ?? false,
          )
        : null;

    return {
      userCardId: candidate.userCardId,
      creditCardId: candidate.creditCardId,
      cardName: candidate.cardName,
      bankName: candidate.bankName,
      bankSlug: candidate.bankSlug,
      cardSlug: candidate.cardSlug,
      rank: index + 1,
      score,
      expectedRewardInr: evaluation.estimatedValueInr,
      effectiveRatePercent: evaluation.effectiveRatePercent,
      explanation: evaluation.explanation,
      ruleKey: evaluation.ruleKey,
      ruleName: evaluation.ruleName,
      excluded: false,
      benefitsApplied: evaluation.benefitsApplied,
      confidenceScore: evaluation.confidenceScore,
      campaignApplied: evaluation.campaignApplied,
      milestoneCrossed: evaluation.milestoneCrossed,
      compositeScoreInr: breakdown.compositeInr,
      scoreBreakdown: engineVersion === 'v1' ? null : breakdown,
      strategicRationale: parts
        ? buildStrategicRationale(signal, parts, evaluation.estimatedValueInr)
        : null,
    };
  });

  for (const entry of ranked) {
    const auditRow = audit.find((row) => row.userCardId === entry.userCardId);
    if (auditRow) {
      auditRow.rank = entry.rank;
      auditRow.score = entry.score;
    }
  }

  return { ranked, audit, engineVersion };
}

export function buildRecommendationSummary(
  ranked: RankedCardRecommendation[],
  merchantName?: string,
  engineVersion: RecommendationEngineVersion = 'v1',
): string {
  if (ranked.length === 0) {
    return merchantName
      ? `No eligible card rewards found for ${merchantName}.`
      : 'No eligible card rewards found for this transaction.';
  }

  const best = ranked[0]!;

  if (engineVersion === 'v3' && best.strategicRationale) {
    const runnerUp = ranked[1];
    const tippedForStrategy =
      runnerUp != null && best.expectedRewardInr < runnerUp.expectedRewardInr;
    if (tippedForStrategy) {
      return `Use ${best.cardName} today. It earns fewer immediate rewards (₹${best.expectedRewardInr} vs ₹${runnerUp.expectedRewardInr} on ${runnerUp.cardName}), but ${best.strategicRationale}`;
    }
    return `${best.cardName} earns ₹${best.expectedRewardInr} immediately. ${best.strategicRationale}`;
  }

  const bonusNote =
    (engineVersion === 'v2' || engineVersion === 'v3') &&
    best.scoreBreakdown &&
    best.scoreBreakdown.compositeInr > best.scoreBreakdown.rewardInr
      ? ` (includes ₹${(best.scoreBreakdown.compositeInr - best.scoreBreakdown.rewardInr).toFixed(0)} contextual bonus)`
      : '';

  return `${best.cardName} earns the most (₹${best.expectedRewardInr}${bonusNote} — ${best.explanation})`;
}

export function buildScoreExplanation(breakdown: RecommendationScoreBreakdown): string[] {
  const lines: string[] = [];
  if (breakdown.merchantBonusInr > 0) {
    lines.push(`+₹${breakdown.merchantBonusInr} merchant context bonus`);
  }
  if (breakdown.preferenceBonusInr > 0) {
    lines.push(`+₹${breakdown.preferenceBonusInr} preference bonus`);
  }
  if (breakdown.promotionBonusInr > 0) {
    lines.push(`+₹${breakdown.promotionBonusInr} active promotion bonus`);
  }
  if (breakdown.strategicMilestoneBonusInr > 0) {
    lines.push(`+₹${breakdown.strategicMilestoneBonusInr} milestone strategy bonus`);
  }
  if (breakdown.strategicExpiryBonusInr > 0) {
    lines.push(`+₹${breakdown.strategicExpiryBonusInr} expiring-rewards bonus`);
  }
  if (breakdown.strategicTravelBonusInr > 0) {
    lines.push(`+₹${breakdown.strategicTravelBonusInr} travel affinity bonus`);
  }
  return lines;
}
