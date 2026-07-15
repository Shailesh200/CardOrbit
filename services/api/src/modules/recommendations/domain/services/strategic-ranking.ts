import type { RecommendationScoreBreakdown } from '@cardwise/validation';

export type StrategicCardSignal = {
  userCardId: string;
  milestoneProgressPercent: number;
  milestoneRemainingInr: number;
  milestoneBonusValueInr: number;
  milestoneLabel: string | null;
  expiringRewardsInr: number;
  travelAffinityScore: number;
};

export type StrategicScoreParts = {
  strategicMilestoneBonusInr: number;
  strategicExpiryBonusInr: number;
  strategicTravelBonusInr: number;
};

function roundInr(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Milestone unlock boost — prefer cards that convert this spend into long-term milestone value. */
export function computeMilestoneStrategicBonus(
  signal: StrategicCardSignal | undefined,
  amountInr: number,
): number {
  if (!signal || signal.milestoneBonusValueInr <= 0 || signal.milestoneRemainingInr <= 0) {
    return 0;
  }
  if (signal.milestoneProgressPercent < 20) return 0;

  const contribution = Math.min(1, amountInr / signal.milestoneRemainingInr);
  const proximity = signal.milestoneProgressPercent / 100;
  return roundInr(signal.milestoneBonusValueInr * contribution * (0.35 + 0.65 * proximity));
}

/** Expiring-balance nudge — keep engagement on cards with near-term reward risk. */
export function computeExpiryStrategicBonus(signal: StrategicCardSignal | undefined): number {
  if (!signal || signal.expiringRewardsInr <= 0) return 0;
  return roundInr(Math.min(80, signal.expiringRewardsInr * 0.02));
}

/** Travel-category affinity boost — lounge / travel-earn cards on travel spend. */
export function computeTravelStrategicBonus(
  signal: StrategicCardSignal | undefined,
  isTravelCategory: boolean,
): number {
  if (!isTravelCategory || !signal || signal.travelAffinityScore <= 0) return 0;
  return roundInr(Math.min(120, signal.travelAffinityScore * 100));
}

export function computeStrategicScoreParts(
  signal: StrategicCardSignal | undefined,
  amountInr: number,
  isTravelCategory: boolean,
): StrategicScoreParts {
  return {
    strategicMilestoneBonusInr: computeMilestoneStrategicBonus(signal, amountInr),
    strategicExpiryBonusInr: computeExpiryStrategicBonus(signal),
    strategicTravelBonusInr: computeTravelStrategicBonus(signal, isTravelCategory),
  };
}

export function applyStrategicBonuses(
  base: RecommendationScoreBreakdown,
  parts: StrategicScoreParts,
): RecommendationScoreBreakdown {
  return {
    ...base,
    strategicMilestoneBonusInr: parts.strategicMilestoneBonusInr,
    strategicExpiryBonusInr: parts.strategicExpiryBonusInr,
    strategicTravelBonusInr: parts.strategicTravelBonusInr,
    compositeInr: roundInr(
      base.compositeInr +
        parts.strategicMilestoneBonusInr +
        parts.strategicExpiryBonusInr +
        parts.strategicTravelBonusInr,
    ),
  };
}

export function buildStrategicRationale(
  signal: StrategicCardSignal | undefined,
  parts: StrategicScoreParts,
  immediateRewardInr: number,
): string | null {
  if (
    !parts.strategicMilestoneBonusInr &&
    !parts.strategicExpiryBonusInr &&
    !parts.strategicTravelBonusInr
  ) {
    return null;
  }

  const lines: string[] = [];
  if (parts.strategicMilestoneBonusInr > 0 && signal?.milestoneLabel) {
    lines.push(
      `Helps unlock ${signal.milestoneLabel} (~₹${Math.round(signal.milestoneBonusValueInr).toLocaleString('en-IN')} long-term value; ${signal.milestoneProgressPercent.toFixed(0)}% progress).`,
    );
  } else if (parts.strategicMilestoneBonusInr > 0) {
    lines.push(
      `Advances an open milestone worth ~₹${Math.round(signal?.milestoneBonusValueInr ?? parts.strategicMilestoneBonusInr).toLocaleString('en-IN')}.`,
    );
  }
  if (parts.strategicTravelBonusInr > 0) {
    lines.push('Strong travel benefits / earn affinity for this spend.');
  }
  if (parts.strategicExpiryBonusInr > 0) {
    lines.push(
      `~₹${Math.round(signal?.expiringRewardsInr ?? 0).toLocaleString('en-IN')} in rewards are nearing expiry on this card.`,
    );
  }

  const longTerm = roundInr(
    immediateRewardInr +
      parts.strategicMilestoneBonusInr +
      parts.strategicExpiryBonusInr +
      parts.strategicTravelBonusInr,
  );
  lines.push(`Estimated long-term value for this decision: ₹${longTerm.toLocaleString('en-IN')}.`);
  return lines.join(' ');
}

export function isTravelCategorySlug(categorySlug: string | null | undefined): boolean {
  if (!categorySlug) return false;
  const normalized = categorySlug.toLowerCase();
  return (
    normalized === 'travel' ||
    normalized === 'air' ||
    normalized === 'hotel' ||
    normalized === 'flight' ||
    normalized.includes('travel')
  );
}
