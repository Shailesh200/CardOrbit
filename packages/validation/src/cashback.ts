import { z } from 'zod';

export const CashbackLedgerStatusSchema = z.enum(['EARNED', 'PENDING', 'CREDITED', 'REVERSED']);
export type CashbackLedgerStatus = z.infer<typeof CashbackLedgerStatusSchema>;

export const CashbackDashboardSchema = z.object({
  totalEarnedInr: z.number(),
  pendingCashbackInr: z.number(),
  creditedCashbackInr: z.number(),
  monthlyCashbackInr: z.number(),
  walletCashbackInr: z.number().nullable(),
  transactionCount: z.number().int().nonnegative(),
  eligibleTransactionCount: z.number().int().nonnegative(),
  periodLabel: z.string(),
});

export type CashbackDashboard = z.infer<typeof CashbackDashboardSchema>;

export const CashbackHistoryItemSchema = z.object({
  id: z.string(),
  transactionId: z.string(),
  userCardId: z.string(),
  cardName: z.string(),
  bankName: z.string(),
  merchantName: z.string(),
  categorySlug: z.string(),
  categoryLabel: z.string(),
  amountInr: z.number(),
  cashbackInr: z.number(),
  cashbackPercent: z.number().nullable(),
  ruleName: z.string().nullable(),
  ledgerStatus: CashbackLedgerStatusSchema,
  transactedAt: z.string().datetime(),
});

export type CashbackHistoryItem = z.infer<typeof CashbackHistoryItemSchema>;

export const ListCashbackHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  userCardId: z.string().optional(),
  ledgerStatus: CashbackLedgerStatusSchema.optional(),
});

export type ListCashbackHistoryQuery = z.infer<typeof ListCashbackHistoryQuerySchema>;

export const CashbackHistoryResponseSchema = z.object({
  items: z.array(CashbackHistoryItemSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});

export type CashbackHistoryResponse = z.infer<typeof CashbackHistoryResponseSchema>;

export const CashbackCategoryBreakdownSchema = z.object({
  categorySlug: z.string(),
  categoryLabel: z.string(),
  creditedCashbackInr: z.number(),
  pendingCashbackInr: z.number(),
  totalCashbackInr: z.number(),
  transactionCount: z.number().int().nonnegative(),
  effectiveRatePercent: z.number(),
});

export type CashbackCategoryBreakdown = z.infer<typeof CashbackCategoryBreakdownSchema>;

export const CashbackCategoriesResponseSchema = z.object({
  categories: z.array(CashbackCategoryBreakdownSchema),
  periodLabel: z.string(),
});

export type CashbackCategoriesResponse = z.infer<typeof CashbackCategoriesResponseSchema>;

export const CashbackForecastSchema = z.object({
  projectedMonthlyCashbackInr: z.number(),
  averageDailyCashbackInr: z.number(),
  basedOnDays: z.number().int().positive(),
  onTrackVsLastMonth: z.boolean(),
  lastMonthCashbackInr: z.number().nonnegative(),
  currentMonthCashbackInr: z.number().nonnegative(),
});

export type CashbackForecast = z.infer<typeof CashbackForecastSchema>;

export const CashbackAttributionSchema = z.object({
  transactionId: z.string(),
  eligible: z.boolean(),
  cashbackInr: z.number(),
  cashbackPercent: z.number().nullable(),
  ruleName: z.string().nullable(),
  ruleKey: z.string().nullable(),
  ledgerStatus: CashbackLedgerStatusSchema.nullable(),
  explanation: z.string().nullable(),
  excluded: z.boolean(),
  exclusionReason: z.string().nullable(),
});

export type CashbackAttribution = z.infer<typeof CashbackAttributionSchema>;

export function parseListCashbackHistoryQuery(raw: unknown): ListCashbackHistoryQuery {
  return ListCashbackHistoryQuerySchema.parse(raw ?? {});
}
