import { z } from 'zod';

export const RewardBalanceKindSchema = z.enum(['POINTS', 'CASHBACK', 'MILES', 'HOTEL_POINTS']);

export type RewardBalanceKind = z.infer<typeof RewardBalanceKindSchema>;

export const RewardBalanceLineSchema = z.object({
  kind: RewardBalanceKindSchema,
  availableAmount: z.number().min(0),
  pendingAmount: z.number().min(0),
  expiredAmount: z.number().min(0),
  expiringAmount: z.number().min(0),
  expiringAt: z.string().datetime().nullable(),
  estimatedValueInr: z.number().min(0).nullable(),
});

export type RewardBalanceLine = z.infer<typeof RewardBalanceLineSchema>;

export const RewardWalletCardSummarySchema = z.object({
  userCardId: z.string(),
  cardName: z.string(),
  bankName: z.string(),
  bankSlug: z.string(),
  cardSlug: z.string(),
  nickname: z.string().nullable(),
  rewardProgramName: z.string().nullable(),
  lastSyncedAt: z.string().datetime().nullable(),
  totalEstimatedValueInr: z.number().min(0),
  balances: z.array(RewardBalanceLineSchema),
});

export type RewardWalletCardSummary = z.infer<typeof RewardWalletCardSummarySchema>;

export const RewardWalletExpiringItemSchema = z.object({
  userCardId: z.string(),
  cardName: z.string(),
  kind: RewardBalanceKindSchema,
  expiringAmount: z.number().min(0),
  expiringAt: z.string().datetime(),
  estimatedValueInr: z.number().min(0).nullable(),
});

export type RewardWalletExpiringItem = z.infer<typeof RewardWalletExpiringItemSchema>;

export const RewardWalletOverviewSchema = z.object({
  cardCount: z.number().int().nonnegative(),
  totalEstimatedValueInr: z.number().min(0),
  totalAvailablePoints: z.number().min(0),
  totalCashbackInr: z.number().min(0),
  expiringSoon: z.array(RewardWalletExpiringItemSchema),
  cards: z.array(RewardWalletCardSummarySchema),
  lastSyncedAt: z.string().datetime().nullable(),
});

export type RewardWalletOverview = z.infer<typeof RewardWalletOverviewSchema>;

export const UpsertRewardBalanceInputSchema = z.object({
  kind: RewardBalanceKindSchema,
  availableAmount: z.number().min(0),
  pendingAmount: z.number().min(0).optional().default(0),
  expiredAmount: z.number().min(0).optional().default(0),
  expiringAmount: z.number().min(0).optional().default(0),
  expiringAt: z.string().datetime().nullable().optional(),
});

export type UpsertRewardBalanceInput = z.infer<typeof UpsertRewardBalanceInputSchema>;

export const UpsertRewardWalletInputSchema = z.object({
  balances: z.array(UpsertRewardBalanceInputSchema).min(1).max(4),
});

export type UpsertRewardWalletInput = z.infer<typeof UpsertRewardWalletInputSchema>;

export function parseUpsertRewardWalletInput(input: unknown): UpsertRewardWalletInput {
  return UpsertRewardWalletInputSchema.parse(input);
}

/** Default point value (INR) when program metadata is unavailable. */
export const DEFAULT_POINT_VALUE_INR = 0.25;

export const REWARD_BALANCE_KIND_LABELS: Record<RewardBalanceKind, string> = {
  POINTS: 'Reward points',
  CASHBACK: 'Cashback',
  MILES: 'Airline miles',
  HOTEL_POINTS: 'Hotel points',
};
