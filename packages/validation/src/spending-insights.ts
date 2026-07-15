import { z } from 'zod';

export const SPENDING_CATEGORY_LABELS: Record<string, string> = {
  dining: 'Dining',
  travel: 'Travel',
  groceries: 'Groceries',
  fuel: 'Fuel',
  online: 'Online shopping',
  shopping: 'Shopping',
  entertainment: 'Entertainment',
  utilities: 'Utilities',
  other: 'Other',
};

export const SpendingCategoryBreakdownSchema = z.object({
  slug: z.string(),
  label: z.string(),
  sharePercent: z.number().min(0).max(100),
  volumeInr: z.number().min(0),
  inquiryCount: z.number().int().nonnegative(),
});

export type SpendingCategoryBreakdown = z.infer<typeof SpendingCategoryBreakdownSchema>;

export const SpendingMerchantSummarySchema = z.object({
  name: z.string(),
  slug: z.string().nullable(),
  volumeInr: z.number().min(0),
  inquiryCount: z.number().int().nonnegative(),
});

export type SpendingMerchantSummary = z.infer<typeof SpendingMerchantSummarySchema>;

export const SpendingInsightItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  actionLabel: z.string().nullable(),
  actionPath: z.string().nullable(),
});

export type SpendingInsightItem = z.infer<typeof SpendingInsightItemSchema>;

export const SpendingInsightsOverviewSchema = z.object({
  totalVolumeInr: z.number().min(0),
  inquiryCount: z.number().int().nonnegative(),
  periodLabel: z.string(),
  dataSource: z.enum(['recommendation_history', 'onboarding_profile', 'blended', 'transactions']),
  categories: z.array(SpendingCategoryBreakdownSchema),
  topMerchants: z.array(SpendingMerchantSummarySchema),
  insights: z.array(SpendingInsightItemSchema),
  topCategorySlug: z.string().nullable(),
  estimatedMonthlySpendInr: z.number().min(0).nullable(),
});

export type SpendingInsightsOverview = z.infer<typeof SpendingInsightsOverviewSchema>;

export function parseSpendingInsightsOverview(input: unknown): SpendingInsightsOverview {
  return SpendingInsightsOverviewSchema.parse(input);
}
