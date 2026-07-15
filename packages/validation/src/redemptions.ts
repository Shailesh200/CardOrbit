import { z } from 'zod';

import { RewardBalanceKindSchema } from './reward-wallet';

export const RedemptionOptionTypeSchema = z.enum([
  'STATEMENT_CREDIT',
  'GIFT_CARD',
  'FLIGHTS',
  'HOTELS',
  'MERCHANDISE',
  'CASHBACK',
  'PARTNER_TRANSFER',
]);

export type RedemptionOptionType = z.infer<typeof RedemptionOptionTypeSchema>;

export const RedemptionRecordStatusSchema = z.enum(['COMPLETED', 'PENDING', 'CANCELLED']);
export type RedemptionRecordStatus = z.infer<typeof RedemptionRecordStatusSchema>;

export const REDEMPTION_OPTION_LABELS: Record<RedemptionOptionType, string> = {
  STATEMENT_CREDIT: 'Statement credit',
  GIFT_CARD: 'Gift cards',
  FLIGHTS: 'Flights',
  HOTELS: 'Hotels',
  MERCHANDISE: 'Merchandise',
  CASHBACK: 'Cashback',
  PARTNER_TRANSFER: 'Partner transfer',
};

export const RedemptionCatalogOptionSchema = z.object({
  id: z.string(),
  userCardId: z.string(),
  cardName: z.string(),
  bankName: z.string(),
  balanceKind: RewardBalanceKindSchema,
  optionType: RedemptionOptionTypeSchema,
  optionLabel: z.string(),
  availablePoints: z.number().min(0),
  pointValueInr: z.number().min(0),
  valueMultiplier: z.number().positive(),
  effectiveRatePercent: z.number().min(0),
  estimatedValueInr: z.number().min(0),
  minPointsRequired: z.number().min(0),
  eligible: z.boolean(),
  ineligibleReason: z.string().nullable(),
});

export type RedemptionCatalogOption = z.infer<typeof RedemptionCatalogOptionSchema>;

export const RedemptionCatalogOverviewSchema = z.object({
  optionCount: z.number().int().nonnegative(),
  eligibleCount: z.number().int().nonnegative(),
  bestValueOptionId: z.string().nullable(),
  options: z.array(RedemptionCatalogOptionSchema),
});

export type RedemptionCatalogOverview = z.infer<typeof RedemptionCatalogOverviewSchema>;

export const RedemptionRecommendationSchema = RedemptionCatalogOptionSchema.extend({
  priorityRank: z.number().int().positive(),
  rationale: z.string(),
  expiryBoost: z.boolean(),
});

export type RedemptionRecommendation = z.infer<typeof RedemptionRecommendationSchema>;

export const RedemptionRecommendationsResponseSchema = z.object({
  recommendations: z.array(RedemptionRecommendationSchema),
  summary: z.string(),
});

export type RedemptionRecommendationsResponse = z.infer<
  typeof RedemptionRecommendationsResponseSchema
>;

export const RedemptionHistoryItemSchema = z.object({
  id: z.string(),
  userCardId: z.string(),
  cardName: z.string(),
  bankName: z.string(),
  balanceKind: RewardBalanceKindSchema,
  optionType: RedemptionOptionTypeSchema,
  optionLabel: z.string(),
  pointsRedeemed: z.number().min(0),
  estimatedValueInr: z.number().min(0),
  effectiveRatePercent: z.number().min(0),
  status: RedemptionRecordStatusSchema,
  notes: z.string().nullable(),
  redeemedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});

export type RedemptionHistoryItem = z.infer<typeof RedemptionHistoryItemSchema>;

export const ListRedemptionHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  userCardId: z.string().optional(),
});

export type ListRedemptionHistoryQuery = z.infer<typeof ListRedemptionHistoryQuerySchema>;

export const RedemptionHistoryResponseSchema = z.object({
  items: z.array(RedemptionHistoryItemSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});

export type RedemptionHistoryResponse = z.infer<typeof RedemptionHistoryResponseSchema>;

export const ValidateRedemptionInputSchema = z.object({
  userCardId: z.string().min(1),
  balanceKind: RewardBalanceKindSchema,
  optionType: RedemptionOptionTypeSchema,
  pointsToRedeem: z.number().positive(),
});

export type ValidateRedemptionInput = z.infer<typeof ValidateRedemptionInputSchema>;

export const RedemptionValidationResultSchema = z.object({
  eligible: z.boolean(),
  pointsToRedeem: z.number().min(0),
  availablePoints: z.number().min(0),
  estimatedValueInr: z.number().min(0),
  effectiveRatePercent: z.number().min(0),
  optionLabel: z.string(),
  reason: z.string().nullable(),
});

export type RedemptionValidationResult = z.infer<typeof RedemptionValidationResultSchema>;

export const RecordRedemptionInputSchema = z.object({
  userCardId: z.string().min(1),
  balanceKind: RewardBalanceKindSchema,
  optionType: RedemptionOptionTypeSchema,
  pointsRedeemed: z.number().positive(),
  redeemedAt: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});

export type RecordRedemptionInput = z.infer<typeof RecordRedemptionInputSchema>;

export function parseListRedemptionHistoryQuery(raw: unknown): ListRedemptionHistoryQuery {
  return ListRedemptionHistoryQuerySchema.parse(raw ?? {});
}

export function parseValidateRedemptionInput(raw: unknown): ValidateRedemptionInput {
  return ValidateRedemptionInputSchema.parse(raw);
}

export function parseRecordRedemptionInput(raw: unknown): RecordRedemptionInput {
  return RecordRedemptionInputSchema.parse(raw);
}
