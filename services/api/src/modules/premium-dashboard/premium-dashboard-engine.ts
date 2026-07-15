import type { PremiumCardRoi, PremiumRecommendation } from '@cardwise/validation';

export const PREMIUM_TIERS = new Set(['PREMIUM', 'SUPER_PREMIUM', 'ULTRA_PREMIUM']);
export const PREMIUM_FEE_THRESHOLD_INR = 5_000;

export const BENEFIT_VALUE_ESTIMATES_INR = {
  LOUNGE: 8_000,
  INSURANCE: 3_000,
  TRAVEL: 2_000,
  FUEL: 1_500,
  DINING: 1_000,
  EMI: 500,
} as const;

export type PremiumCardInput = {
  userCardId: string;
  creditCardId: string;
  cardName: string;
  bankName: string;
  tier: string | null;
  annualFeeInr: number | null;
  walletValueInr: number;
  spendVolumeInr: number;
  benefitCounts: {
    lounge: number;
    insurance: number;
    travel: number;
    fuel: number;
    dining: number;
    emi: number;
  };
  milestoneBonusPotentialInr: number;
  feeWaiverProgressPercent: number | null;
};

export function roundInr(value: number): number {
  return Math.round(value * 100) / 100;
}

export function isPremiumCard(tier: string | null, annualFeeInr: number | null): boolean {
  if (tier && PREMIUM_TIERS.has(tier.toUpperCase())) return true;
  return (annualFeeInr ?? 0) >= PREMIUM_FEE_THRESHOLD_INR;
}

export function estimateBenefitsValueInr(counts: PremiumCardInput['benefitCounts']): number {
  return roundInr(
    counts.lounge * BENEFIT_VALUE_ESTIMATES_INR.LOUNGE +
      counts.insurance * BENEFIT_VALUE_ESTIMATES_INR.INSURANCE +
      counts.travel * BENEFIT_VALUE_ESTIMATES_INR.TRAVEL +
      counts.fuel * BENEFIT_VALUE_ESTIMATES_INR.FUEL +
      counts.dining * BENEFIT_VALUE_ESTIMATES_INR.DINING +
      counts.emi * BENEFIT_VALUE_ESTIMATES_INR.EMI,
  );
}

export function computeRewardEfficiencyPercent(
  walletValueInr: number,
  spendVolumeInr: number,
): number {
  if (spendVolumeInr <= 0) return 0;
  return roundInr((walletValueInr / spendVolumeInr) * 100);
}

export function buildPremiumCardRoi(input: PremiumCardInput): PremiumCardRoi {
  const estimatedBenefitsValueInr = estimateBenefitsValueInr(input.benefitCounts);
  const annualFeeInr = input.annualFeeInr ?? 0;
  const annualSavingsInr = roundInr(
    input.walletValueInr + estimatedBenefitsValueInr + input.milestoneBonusPotentialInr,
  );
  const netRoiInr = roundInr(annualSavingsInr - annualFeeInr);
  const benefitCount =
    input.benefitCounts.lounge +
    input.benefitCounts.insurance +
    input.benefitCounts.travel +
    input.benefitCounts.fuel +
    input.benefitCounts.dining +
    input.benefitCounts.emi;

  return {
    userCardId: input.userCardId,
    creditCardId: input.creditCardId,
    cardName: input.cardName,
    bankName: input.bankName,
    tier: input.tier ?? 'STANDARD',
    annualFeeInr: input.annualFeeInr,
    walletValueInr: roundInr(input.walletValueInr),
    spendVolumeInr: roundInr(input.spendVolumeInr),
    estimatedBenefitsValueInr,
    milestoneBonusPotentialInr: roundInr(input.milestoneBonusPotentialInr),
    annualSavingsInr,
    netRoiInr,
    rewardEfficiencyPercent: computeRewardEfficiencyPercent(
      input.walletValueInr,
      input.spendVolumeInr,
    ),
    benefitCount,
    loungeCount: input.benefitCounts.lounge,
    insuranceCount: input.benefitCounts.insurance,
    feeWaiverProgressPercent: input.feeWaiverProgressPercent,
  };
}

export function buildPremiumRecommendations(cards: PremiumCardRoi[]): PremiumRecommendation[] {
  const recommendations: PremiumRecommendation[] = [];
  let rank = 1;

  const sortedByRoi = [...cards].sort((a, b) => b.netRoiInr - a.netRoiInr);
  const best = sortedByRoi[0];
  if (best && best.netRoiInr > 0) {
    recommendations.push({
      kind: 'ROI',
      title: `Best premium ROI: ${best.cardName}`,
      description: `Estimated net value ~₹${best.netRoiInr.toLocaleString('en-IN')} after annual fee, wallet balance, and lifestyle benefits.`,
      userCardId: best.userCardId,
      cardName: best.cardName,
      priorityRank: rank++,
      estimatedValueInr: best.netRoiInr,
    });
  }

  for (const card of cards.filter((row) => row.netRoiInr < 0)) {
    recommendations.push({
      kind: 'USAGE',
      title: `Review ${card.cardName} premium value`,
      description: `Annual fee may exceed estimated benefits by ~₹${Math.abs(card.netRoiInr).toLocaleString('en-IN')}. Increase spend or use lounge/insurance perks.`,
      userCardId: card.userCardId,
      cardName: card.cardName,
      priorityRank: rank++,
      estimatedValueInr: card.netRoiInr,
    });
  }

  for (const card of cards.filter(
    (row) => row.feeWaiverProgressPercent != null && row.feeWaiverProgressPercent >= 70,
  )) {
    recommendations.push({
      kind: 'FEE_WAIVER',
      title: `Fee waiver within reach on ${card.cardName}`,
      description: `${card.feeWaiverProgressPercent}% progress toward annual fee waiver — prioritize spend on this card.`,
      userCardId: card.userCardId,
      cardName: card.cardName,
      priorityRank: rank++,
      estimatedValueInr: card.annualFeeInr,
    });
  }

  const lowEfficiency = cards.filter(
    (row) => row.spendVolumeInr > 10_000 && row.rewardEfficiencyPercent < 1,
  );
  for (const card of lowEfficiency.slice(0, 2)) {
    recommendations.push({
      kind: 'EFFICIENCY',
      title: `Improve reward efficiency on ${card.cardName}`,
      description: `Only ${card.rewardEfficiencyPercent.toFixed(2)}% wallet value vs recent spend — route more category-aligned purchases here.`,
      userCardId: card.userCardId,
      cardName: card.cardName,
      priorityRank: rank++,
      estimatedValueInr: null,
    });
  }

  for (const card of cards.filter((row) => row.milestoneBonusPotentialInr > 0).slice(0, 2)) {
    recommendations.push({
      kind: 'MILESTONE',
      title: `Milestone upside on ${card.cardName}`,
      description: `~₹${card.milestoneBonusPotentialInr.toLocaleString('en-IN')} in milestone bonus potential still in progress.`,
      userCardId: card.userCardId,
      cardName: card.cardName,
      priorityRank: rank++,
      estimatedValueInr: card.milestoneBonusPotentialInr,
    });
  }

  return recommendations.slice(0, 8);
}

export function buildPremiumSummary(input: {
  premiumCardCount: number;
  portfolioNetRoiInr: number;
  averageRewardEfficiencyPercent: number;
  bestCardName: string | null;
}): string {
  if (input.premiumCardCount === 0) {
    return 'No premium-tier cards detected in your portfolio. Add a premium card to unlock ROI tracking.';
  }

  const roiLine =
    input.portfolioNetRoiInr >= 0
      ? `Portfolio net premium value ~₹${input.portfolioNetRoiInr.toLocaleString('en-IN')} after fees.`
      : `Premium fees currently exceed estimated value by ~₹${Math.abs(input.portfolioNetRoiInr).toLocaleString('en-IN')}.`;

  const efficiencyLine = `Average reward efficiency ${input.averageRewardEfficiencyPercent.toFixed(2)}% across premium cards.`;
  const bestLine = input.bestCardName
    ? `Top performer: ${input.bestCardName}.`
    : 'Compare cards below to optimize premium usage.';

  return `${input.premiumCardCount} premium card${input.premiumCardCount === 1 ? '' : 's'} tracked. ${roiLine} ${efficiencyLine} ${bestLine}`;
}

export function buildPremiumDashboardOverview(input: {
  cards: PremiumCardRoi[];
  periodLabel: string;
}): {
  premiumCardCount: number;
  totalAnnualFeesInr: number;
  totalWalletValueInr: number;
  totalEstimatedBenefitsInr: number;
  totalAnnualSavingsInr: number;
  portfolioNetRoiInr: number;
  averageRewardEfficiencyPercent: number;
  bestRoiCardUserCardId: string | null;
  recommendations: PremiumRecommendation[];
  summary: string;
} {
  const cards = input.cards;
  const premiumCardCount = cards.length;
  const totalAnnualFeesInr = roundInr(cards.reduce((sum, row) => sum + (row.annualFeeInr ?? 0), 0));
  const totalWalletValueInr = roundInr(cards.reduce((sum, row) => sum + row.walletValueInr, 0));
  const totalEstimatedBenefitsInr = roundInr(
    cards.reduce((sum, row) => sum + row.estimatedBenefitsValueInr, 0),
  );
  const totalAnnualSavingsInr = roundInr(cards.reduce((sum, row) => sum + row.annualSavingsInr, 0));
  const portfolioNetRoiInr = roundInr(cards.reduce((sum, row) => sum + row.netRoiInr, 0));
  const averageRewardEfficiencyPercent =
    premiumCardCount === 0
      ? 0
      : roundInr(
          cards.reduce((sum, row) => sum + row.rewardEfficiencyPercent, 0) / premiumCardCount,
        );

  const best = [...cards].sort((a, b) => b.netRoiInr - a.netRoiInr)[0] ?? null;

  return {
    premiumCardCount,
    totalAnnualFeesInr,
    totalWalletValueInr,
    totalEstimatedBenefitsInr,
    totalAnnualSavingsInr,
    portfolioNetRoiInr,
    averageRewardEfficiencyPercent,
    bestRoiCardUserCardId: best?.userCardId ?? null,
    recommendations: buildPremiumRecommendations(cards),
    summary: buildPremiumSummary({
      premiumCardCount,
      portfolioNetRoiInr,
      averageRewardEfficiencyPercent,
      bestCardName: best?.cardName ?? null,
    }),
  };
}
