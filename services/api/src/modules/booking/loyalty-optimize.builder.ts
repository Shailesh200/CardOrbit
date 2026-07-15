import type {
  BookingExplanationFactor,
  BookingLoyaltyOptimizeResult,
  BookingLoyaltyOption,
  BookingLoyaltyPath,
} from '@cardwise/validation';

import { roundInr } from './booking.builder';

export type LoyaltyOptimizeContext = {
  /** Card cash + points value share of gross (combined). */
  cardRewardRate: number;
  /** Bank portal acceleration lift share of gross vs baseline OTA. */
  portalAccelerationRate: number;
  /** Chain loyalty earn value share when booked with member rates. */
  chainEarnRate: number;
  /** Assumed redeemable chain points balance (mock). */
  redeemablePoints: number;
  /** INR value per chain loyalty point. */
  pointValueInr: number;
  preferredCardName: string | null;
  loyaltyProgram: string | null;
};

const DEFAULT_CONTEXT: LoyaltyOptimizeContext = {
  cardRewardRate: 0.07,
  portalAccelerationRate: 0.12,
  chainEarnRate: 0.09,
  redeemablePoints: 0,
  pointValueInr: 0.4,
  preferredCardName: null,
  loyaltyProgram: null,
};

export function buildLoyaltyOptimizeResult(input: {
  offerId?: string | null;
  grossPriceInr: number;
  context?: Partial<LoyaltyOptimizeContext>;
}): BookingLoyaltyOptimizeResult {
  const ctx: LoyaltyOptimizeContext = { ...DEFAULT_CONTEXT, ...input.context };
  const gross = roundInr(input.grossPriceInr);
  const program = ctx.loyaltyProgram ?? 'Hotel loyalty';

  const paths: Array<{
    path: BookingLoyaltyPath;
    label: string;
    rewardInr: number;
    detail: string;
    explanations: BookingExplanationFactor[];
  }> = [];

  const cardReward = roundInr(gross * ctx.cardRewardRate);
  paths.push({
    path: 'CARD_CASH_REWARDS',
    label: ctx.preferredCardName
      ? `Pay with ${ctx.preferredCardName}`
      : 'Pay with travel card rewards',
    rewardInr: cardReward,
    detail: `Est. ₹${cardReward.toLocaleString('en-IN')} from card cashback + points`,
    explanations: [
      {
        code: 'CARD_REWARDS',
        label: 'Card rewards',
        detail: `${Math.round(ctx.cardRewardRate * 100)}% estimated portfolio earn on hotel spend`,
        impactInr: cardReward,
      },
    ],
  });

  const chainEarn = roundInr(gross * ctx.chainEarnRate);
  paths.push({
    path: 'CHAIN_LOYALTY_EARN',
    label: `Earn ${program} points`,
    rewardInr: chainEarn,
    detail: `Member stay estimated at ₹${chainEarn.toLocaleString('en-IN')} loyalty value`,
    explanations: [
      {
        code: 'CHAIN_EARN',
        label: 'Chain loyalty earn',
        detail: `${program} base earn valued at ${Math.round(ctx.chainEarnRate * 100)}% of stay`,
        impactInr: chainEarn,
      },
    ],
  });

  const portalLift = roundInr(gross * ctx.portalAccelerationRate);
  paths.push({
    path: 'PORTAL_ACCELERATION',
    label: 'Book via bank travel portal',
    rewardInr: portalLift,
    detail: `Accelerated portal earn worth ~₹${portalLift.toLocaleString('en-IN')}`,
    explanations: [
      {
        code: 'PORTAL_LIFT',
        label: 'Portal acceleration',
        detail: 'Issuer portal multiplier vs generic OTA baseline',
        impactInr: portalLift,
      },
    ],
  });

  const redeemValue = roundInr(Math.min(gross * 0.85, ctx.redeemablePoints * ctx.pointValueInr));
  if (redeemValue > 0) {
    paths.push({
      path: 'CHAIN_POINTS_REDEEM',
      label: `Redeem ${program} points`,
      rewardInr: redeemValue,
      detail: `Use ~${Math.round(redeemValue / Math.max(ctx.pointValueInr, 0.01)).toLocaleString('en-IN')} points (~₹${redeemValue.toLocaleString('en-IN')})`,
      explanations: [
        {
          code: 'POINTS_REDEEM',
          label: 'Points redemption',
          detail: 'Estimated award-night value from available loyalty balance',
          impactInr: redeemValue,
        },
      ],
    });
  }

  const ranked = [...paths]
    .map((row) => ({
      ...row,
      estimatedEffectiveCostInr: roundInr(gross - row.rewardInr),
    }))
    .sort((a, b) => a.estimatedEffectiveCostInr - b.estimatedEffectiveCostInr);

  const options: BookingLoyaltyOption[] = ranked.map((row, index) => ({
    path: row.path,
    label: row.label,
    rank: index + 1,
    estimatedRewardValueInr: row.rewardInr,
    estimatedEffectiveCostInr: row.estimatedEffectiveCostInr,
    selected: index === 0,
    detail: row.detail,
    explanations: row.explanations,
  }));

  return {
    offerId: input.offerId ?? null,
    grossPriceInr: gross,
    pathCount: options.length,
    paths: options,
    recommendedPath: options[0]?.path ?? null,
    recommendedLabel: options[0]?.label ?? null,
  };
}
