import {
  DEFAULT_POINT_VALUE_INR,
  REDEMPTION_OPTION_LABELS,
  type RedemptionCatalogOption,
  type RedemptionOptionType,
  type RedemptionRecommendation,
  type RedemptionValidationResult,
  type RewardBalanceKind,
} from '@cardwise/validation';

export type BalanceSnapshot = {
  kind: RewardBalanceKind;
  availableAmount: number;
  expiringAmount: number;
  expiringAt: Date | null;
};

export type CardSnapshot = {
  userCardId: string;
  cardName: string;
  bankName: string;
  pointValueInr: number;
  balances: BalanceSnapshot[];
};

const VALUE_MULTIPLIERS: Record<RedemptionOptionType, number> = {
  STATEMENT_CREDIT: 1,
  CASHBACK: 1,
  GIFT_CARD: 0.9,
  FLIGHTS: 1.25,
  HOTELS: 1.15,
  MERCHANDISE: 0.75,
  PARTNER_TRANSFER: 1.1,
};

const MIN_POINTS: Partial<Record<RedemptionOptionType, number>> = {
  STATEMENT_CREDIT: 500,
  GIFT_CARD: 1000,
  FLIGHTS: 5000,
  HOTELS: 3000,
  MERCHANDISE: 1000,
  CASHBACK: 100,
  PARTNER_TRANSFER: 2000,
};

const OPTIONS_BY_KIND: Record<RewardBalanceKind, RedemptionOptionType[]> = {
  POINTS: ['STATEMENT_CREDIT', 'GIFT_CARD', 'FLIGHTS', 'HOTELS', 'MERCHANDISE', 'PARTNER_TRANSFER'],
  CASHBACK: ['CASHBACK', 'STATEMENT_CREDIT'],
  MILES: ['FLIGHTS', 'PARTNER_TRANSFER', 'HOTELS'],
  HOTEL_POINTS: ['HOTELS', 'PARTNER_TRANSFER', 'MERCHANDISE'],
};

export function roundInr(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildOptionId(
  userCardId: string,
  balanceKind: RewardBalanceKind,
  optionType: RedemptionOptionType,
): string {
  return `${userCardId}:${balanceKind}:${optionType}`;
}

export function computeRedemptionValue(input: {
  points: number;
  balanceKind: RewardBalanceKind;
  pointValueInr: number;
  optionType: RedemptionOptionType;
}): { estimatedValueInr: number; effectiveRatePercent: number; valueMultiplier: number } {
  const multiplier = VALUE_MULTIPLIERS[input.optionType];
  const baseRate =
    input.balanceKind === 'CASHBACK'
      ? 1
      : input.pointValueInr > 0
        ? input.pointValueInr
        : DEFAULT_POINT_VALUE_INR;

  const estimatedValueInr = roundInr(input.points * baseRate * multiplier);
  const effectiveRatePercent =
    input.points > 0 ? roundInr((estimatedValueInr / input.points) * 100) : 0;

  return { estimatedValueInr, effectiveRatePercent, valueMultiplier: multiplier };
}

export function validateRedemption(input: {
  availablePoints: number;
  balanceKind: RewardBalanceKind;
  pointValueInr: number;
  optionType: RedemptionOptionType;
  pointsToRedeem: number;
}): RedemptionValidationResult {
  const optionLabel = REDEMPTION_OPTION_LABELS[input.optionType];
  const minPoints = MIN_POINTS[input.optionType] ?? 0;
  const applicable = OPTIONS_BY_KIND[input.balanceKind]?.includes(input.optionType) ?? false;

  if (!applicable) {
    return {
      eligible: false,
      pointsToRedeem: input.pointsToRedeem,
      availablePoints: input.availablePoints,
      estimatedValueInr: 0,
      effectiveRatePercent: 0,
      optionLabel,
      reason: `${optionLabel} is not available for ${input.balanceKind.toLowerCase().replaceAll('_', ' ')}.`,
    };
  }

  if (input.pointsToRedeem > input.availablePoints) {
    return {
      eligible: false,
      pointsToRedeem: input.pointsToRedeem,
      availablePoints: input.availablePoints,
      estimatedValueInr: 0,
      effectiveRatePercent: 0,
      optionLabel,
      reason: 'Insufficient balance for this redemption.',
    };
  }

  if (input.pointsToRedeem < minPoints) {
    return {
      eligible: false,
      pointsToRedeem: input.pointsToRedeem,
      availablePoints: input.availablePoints,
      estimatedValueInr: 0,
      effectiveRatePercent: 0,
      optionLabel,
      reason: `Minimum ${minPoints.toLocaleString('en-IN')} required for ${optionLabel.toLowerCase()}.`,
    };
  }

  const value = computeRedemptionValue({
    points: input.pointsToRedeem,
    balanceKind: input.balanceKind,
    pointValueInr: input.pointValueInr,
    optionType: input.optionType,
  });

  return {
    eligible: true,
    pointsToRedeem: input.pointsToRedeem,
    availablePoints: input.availablePoints,
    estimatedValueInr: value.estimatedValueInr,
    effectiveRatePercent: value.effectiveRatePercent,
    optionLabel,
    reason: null,
  };
}

export function buildCatalogForCard(card: CardSnapshot): RedemptionCatalogOption[] {
  const options: RedemptionCatalogOption[] = [];

  for (const balance of card.balances) {
    if (balance.availableAmount <= 0) continue;

    for (const optionType of OPTIONS_BY_KIND[balance.kind] ?? []) {
      const minPoints = MIN_POINTS[optionType] ?? 0;
      const value = computeRedemptionValue({
        points: balance.availableAmount,
        balanceKind: balance.kind,
        pointValueInr: card.pointValueInr,
        optionType,
      });

      const eligible = balance.availableAmount >= minPoints;
      options.push({
        id: buildOptionId(card.userCardId, balance.kind, optionType),
        userCardId: card.userCardId,
        cardName: card.cardName,
        bankName: card.bankName,
        balanceKind: balance.kind,
        optionType,
        optionLabel: REDEMPTION_OPTION_LABELS[optionType],
        availablePoints: balance.availableAmount,
        pointValueInr: card.pointValueInr,
        valueMultiplier: value.valueMultiplier,
        effectiveRatePercent: value.effectiveRatePercent,
        estimatedValueInr: value.estimatedValueInr,
        minPointsRequired: minPoints,
        eligible,
        ineligibleReason: eligible
          ? null
          : `Need at least ${minPoints.toLocaleString('en-IN')} ${balance.kind === 'CASHBACK' ? 'INR' : 'points'}.`,
      });
    }
  }

  return options;
}

export function buildRecommendations(
  options: RedemptionCatalogOption[],
  balances: Array<BalanceSnapshot & { userCardId: string; cardName: string }>,
): { recommendations: RedemptionRecommendation[]; summary: string } {
  const eligible = options.filter((row) => row.eligible);
  const now = Date.now();
  const expiryWindowMs = 30 * 24 * 60 * 60 * 1000;

  const scored = eligible.map((option) => {
    const balance = balances.find(
      (row) => row.userCardId === option.userCardId && row.kind === option.balanceKind,
    );
    const expiryBoost =
      balance != null &&
      balance.expiringAmount > 0 &&
      balance.expiringAt != null &&
      balance.expiringAt.getTime() - now <= expiryWindowMs;

    let score = option.estimatedValueInr;
    if (expiryBoost) score *= 1.15;

    return { option, score, expiryBoost };
  });

  scored.sort((a, b) => b.score - a.score);

  const recommendations: RedemptionRecommendation[] = scored.slice(0, 8).map((row, index) => ({
    ...row.option,
    priorityRank: index + 1,
    expiryBoost: row.expiryBoost,
    rationale: recommendationRationale(row.option, row.expiryBoost),
  }));

  const top = recommendations[0];
  const summary = top
    ? top.expiryBoost
      ? `Redeem ${top.optionLabel.toLowerCase()} on ${top.cardName} first — best value with rewards expiring soon.`
      : `Best value: ${top.optionLabel} on ${top.cardName} (~${formatInr(top.estimatedValueInr)}).`
    : 'Add reward balances to your wallet to unlock redemption recommendations.';

  return { recommendations, summary };
}

function recommendationRationale(option: RedemptionCatalogOption, expiryBoost: boolean): string {
  const valueLine = `~${formatInr(option.estimatedValueInr)} at ${option.effectiveRatePercent.toFixed(2)}% effective rate`;
  if (expiryBoost) {
    return `${option.optionLabel} on ${option.cardName} — ${valueLine}; balance expiring soon.`;
  }
  if (option.optionType === 'FLIGHTS' || option.optionType === 'HOTELS') {
    return `${option.optionLabel} typically delivers premium value — ${valueLine}.`;
  }
  if (option.optionType === 'STATEMENT_CREDIT' || option.optionType === 'CASHBACK') {
    return `${option.optionLabel} offers flexible value — ${valueLine}.`;
  }
  return `${option.optionLabel} — ${valueLine}.`;
}

function formatInr(value: number): string {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

export function pickBestValueOptionId(options: RedemptionCatalogOption[]): string | null {
  const eligible = options.filter((row) => row.eligible);
  if (eligible.length === 0) return null;
  eligible.sort((a, b) => b.estimatedValueInr - a.estimatedValueInr);
  return eligible[0]?.id ?? null;
}
