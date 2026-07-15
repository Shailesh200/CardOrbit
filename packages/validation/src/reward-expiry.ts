import { z } from 'zod';

import { RewardBalanceKindSchema } from './reward-wallet';

/** Alert windows per FR-NOTIF / NOTIF-005 spec (days before expiry). */
export const REWARD_EXPIRY_ALERT_WINDOWS = [30, 14, 7, 1] as const;

export type RewardExpiryAlertWindow = (typeof REWARD_EXPIRY_ALERT_WINDOWS)[number];

export const RewardExpiryItemSchema = z.object({
  balanceId: z.string(),
  userCardId: z.string(),
  cardName: z.string(),
  bankName: z.string(),
  bankSlug: z.string(),
  cardSlug: z.string(),
  kind: RewardBalanceKindSchema,
  expiringAmount: z.number().min(0),
  expiringAt: z.string().datetime(),
  daysRemaining: z.number().int(),
  estimatedValueInr: z.number().min(0).nullable(),
  urgencyScore: z.number().min(0),
  alertWindow: z.number().int().nullable(),
});

export type RewardExpiryItem = z.infer<typeof RewardExpiryItemSchema>;

export const RedeemFirstItemSchema = RewardExpiryItemSchema.extend({
  priorityRank: z.number().int().positive(),
  rationale: z.string(),
});

export type RedeemFirstItem = z.infer<typeof RedeemFirstItemSchema>;

export const RedemptionStrategySchema = z.object({
  summary: z.string(),
  redeemFirst: z.array(RedeemFirstItemSchema),
  highValue: z.array(RewardExpiryItemSchema),
});

export type RedemptionStrategy = z.infer<typeof RedemptionStrategySchema>;

export const RewardExpiryIntelligenceSchema = z.object({
  expiringSoon: z.array(RewardExpiryItemSchema),
  highValue: z.array(RewardExpiryItemSchema),
  redeemFirst: z.array(RedeemFirstItemSchema),
  strategy: RedemptionStrategySchema,
  totalExpiringValueInr: z.number().min(0),
  alertsDelivered: z.number().int().nonnegative(),
});

export type RewardExpiryIntelligence = z.infer<typeof RewardExpiryIntelligenceSchema>;

export const REWARD_BALANCE_KIND_SHORT_LABELS: Record<
  z.infer<typeof RewardBalanceKindSchema>,
  string
> = {
  POINTS: 'reward points',
  CASHBACK: 'cashback',
  MILES: 'airline miles',
  HOTEL_POINTS: 'hotel points',
};
