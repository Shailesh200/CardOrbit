import { z } from 'zod';

export const MilestonePeriodSchema = z.enum(['monthly', 'quarterly', 'annual']);
export type MilestonePeriod = z.infer<typeof MilestonePeriodSchema>;

export const MilestoneStatusSchema = z.enum(['NOT_STARTED', 'IN_PROGRESS', 'ACHIEVED']);
export type MilestoneStatus = z.infer<typeof MilestoneStatusSchema>;

export const SpendMilestoneProgressSchema = z.object({
  id: z.string(),
  userCardId: z.string(),
  creditCardId: z.string(),
  cardName: z.string(),
  bankName: z.string(),
  ruleId: z.string(),
  ruleName: z.string(),
  label: z.string(),
  period: MilestonePeriodSchema,
  periodLabel: z.string(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  spendThresholdInr: z.number().nonnegative(),
  currentSpendInr: z.number().nonnegative(),
  remainingSpendInr: z.number().nonnegative(),
  progressPercent: z.number().min(0).max(100),
  milestoneBonus: z.number().nullable(),
  status: MilestoneStatusSchema,
  transactionCount: z.number().int().nonnegative(),
  daysRemaining: z.number().int().nonnegative(),
});

export type SpendMilestoneProgress = z.infer<typeof SpendMilestoneProgressSchema>;

export const AnnualFeeWaiverProgressSchema = z.object({
  userCardId: z.string(),
  creditCardId: z.string(),
  cardName: z.string(),
  bankName: z.string(),
  annualFeeInr: z.number().nonnegative().nullable(),
  requiredSpendInr: z.number().nonnegative(),
  currentSpendInr: z.number().nonnegative(),
  remainingSpendInr: z.number().nonnegative(),
  progressPercent: z.number().min(0).max(100),
  status: MilestoneStatusSchema,
  periodLabel: z.string(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  daysRemaining: z.number().int().nonnegative(),
  waiverSummary: z.string().nullable(),
});

export type AnnualFeeWaiverProgress = z.infer<typeof AnnualFeeWaiverProgressSchema>;

export const MilestoneForecastSchema = z.object({
  milestoneId: z.string(),
  userCardId: z.string(),
  cardName: z.string(),
  label: z.string(),
  estimatedCompletionDate: z.string().datetime().nullable(),
  onTrack: z.boolean(),
  averageDailySpendInr: z.number().nonnegative(),
});

export type MilestoneForecast = z.infer<typeof MilestoneForecastSchema>;

export const MilestoneTrackerOverviewSchema = z.object({
  spendMilestones: z.array(SpendMilestoneProgressSchema),
  achievedCount: z.number().int().nonnegative(),
  inProgressCount: z.number().int().nonnegative(),
});

export type MilestoneTrackerOverview = z.infer<typeof MilestoneTrackerOverviewSchema>;

export const AnnualFeeWaiverOverviewSchema = z.object({
  items: z.array(AnnualFeeWaiverProgressSchema),
  qualifiedCount: z.number().int().nonnegative(),
});

export type AnnualFeeWaiverOverview = z.infer<typeof AnnualFeeWaiverOverviewSchema>;

export const MilestoneForecastResponseSchema = z.object({
  forecasts: z.array(MilestoneForecastSchema),
});

export type MilestoneForecastResponse = z.infer<typeof MilestoneForecastResponseSchema>;
