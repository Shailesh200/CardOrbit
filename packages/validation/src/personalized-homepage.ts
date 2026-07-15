import { z } from 'zod';

import { RewardBalanceKindSchema } from './reward-wallet';

export const HomepageTimeOfDaySchema = z.enum(['morning', 'afternoon', 'evening']);
export type HomepageTimeOfDay = z.infer<typeof HomepageTimeOfDaySchema>;

export const HomepageMorningSummarySchema = z.object({
  timeOfDay: HomepageTimeOfDaySchema,
  greeting: z.string(),
  headline: z.string(),
  supportingLine: z.string(),
  highlights: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      value: z.string(),
      actionPath: z.string().optional(),
    }),
  ),
});

export type HomepageMorningSummary = z.infer<typeof HomepageMorningSummarySchema>;

export const HomepageActionPrioritySchema = z.enum(['high', 'medium', 'low']);
export type HomepageActionPriority = z.infer<typeof HomepageActionPrioritySchema>;

export const HomepageRecommendedActionSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  priority: HomepageActionPrioritySchema,
  actionLabel: z.string(),
  actionPath: z.string(),
});

export type HomepageRecommendedAction = z.infer<typeof HomepageRecommendedActionSchema>;

export const HomepageExpiringRewardSchema = z.object({
  userCardId: z.string(),
  cardName: z.string(),
  kind: RewardBalanceKindSchema,
  expiringAmount: z.number().min(0),
  expiringAt: z.string().datetime(),
  estimatedValueInr: z.number().min(0).nullable(),
  daysRemaining: z.number().int(),
});

export type HomepageExpiringReward = z.infer<typeof HomepageExpiringRewardSchema>;

export const HomepageMilestonePreviewSchema = z.object({
  id: z.string(),
  cardName: z.string(),
  label: z.string(),
  progressPercent: z.number().min(0).max(100),
  remainingSpendInr: z.number().nonnegative(),
  daysRemaining: z.number().int().nonnegative(),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'ACHIEVED']),
});

export type HomepageMilestonePreview = z.infer<typeof HomepageMilestonePreviewSchema>;

export const HomepageTravelPreviewSchema = z.object({
  loungeCardCount: z.number().int().nonnegative(),
  totalMiles: z.number().min(0),
  totalMilesValueInr: z.number().min(0),
  travelOfferCount: z.number().int().nonnegative(),
  recentTravelSpendInr: z.number().min(0),
  periodLabel: z.string(),
  hasTravelContext: z.boolean(),
});

export type HomepageTravelPreview = z.infer<typeof HomepageTravelPreviewSchema>;

export const HomepageRecentActivityItemSchema = z.object({
  id: z.string(),
  merchantName: z.string(),
  cardName: z.string(),
  amountInr: z.number(),
  categoryLabel: z.string().nullable(),
  transactedAt: z.string().datetime(),
});

export type HomepageRecentActivityItem = z.infer<typeof HomepageRecentActivityItemSchema>;

export const HomepageRewardWalletPreviewSchema = z.object({
  cardCount: z.number().int().nonnegative(),
  totalEstimatedValueInr: z.number().min(0),
  expiringSoonCount: z.number().int().nonnegative(),
});

export type HomepageRewardWalletPreview = z.infer<typeof HomepageRewardWalletPreviewSchema>;
