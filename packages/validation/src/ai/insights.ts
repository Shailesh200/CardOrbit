import { z } from 'zod';

export const DashboardInsightSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  source: z.enum(['ai', 'template']).default('template'),
  actionLabel: z.string().optional(),
  actionPath: z.string().optional(),
});

export type DashboardInsight = z.infer<typeof DashboardInsightSchema>;

export const SmartInsightsOutputSchema = z.object({
  insights: z
    .array(DashboardInsightSchema.omit({ source: true }))
    .min(1)
    .max(3),
});

export type SmartInsightsOutput = z.infer<typeof SmartInsightsOutputSchema>;

export const SmartInsightsContextSchema = z.object({
  preferredRewardType: z.string(),
  preferredRewardLabel: z.string(),
  preferredCategorySlugs: z.array(z.string()),
  preferredCategoryLabels: z.array(z.string()).optional(),
  spendBand: z.string().nullable(),
  boostFavoriteCards: z.boolean(),
  portfolioCount: z.number().int().nonnegative(),
  favoriteCount: z.number().int().nonnegative(),
  recommendationScenario: z.object({
    merchantSlug: z.string(),
    merchantName: z.string().optional(),
    categorySlug: z.string(),
    categoryLabel: z.string().optional(),
    amount: z.number(),
  }),
});

export type SmartInsightsContext = z.infer<typeof SmartInsightsContextSchema>;
