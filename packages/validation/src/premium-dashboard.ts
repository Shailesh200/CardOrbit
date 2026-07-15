import { z } from 'zod';

export const PremiumCardTierSchema = z.enum([
  'ENTRY',
  'STANDARD',
  'PREMIUM',
  'SUPER_PREMIUM',
  'ULTRA_PREMIUM',
]);

export type PremiumCardTier = z.infer<typeof PremiumCardTierSchema>;

export const PremiumRecommendationKindSchema = z.enum([
  'ROI',
  'FEE_WAIVER',
  'EFFICIENCY',
  'MILESTONE',
  'USAGE',
]);

export type PremiumRecommendationKind = z.infer<typeof PremiumRecommendationKindSchema>;

export const PremiumCardRoiSchema = z.object({
  userCardId: z.string(),
  creditCardId: z.string(),
  cardName: z.string(),
  bankName: z.string(),
  tier: z.string(),
  annualFeeInr: z.number().min(0).nullable(),
  walletValueInr: z.number().min(0),
  spendVolumeInr: z.number().min(0),
  estimatedBenefitsValueInr: z.number().min(0),
  milestoneBonusPotentialInr: z.number().min(0),
  annualSavingsInr: z.number(),
  netRoiInr: z.number(),
  rewardEfficiencyPercent: z.number().min(0),
  benefitCount: z.number().int().nonnegative(),
  loungeCount: z.number().int().nonnegative(),
  insuranceCount: z.number().int().nonnegative(),
  feeWaiverProgressPercent: z.number().min(0).max(100).nullable(),
});

export type PremiumCardRoi = z.infer<typeof PremiumCardRoiSchema>;

export const PremiumRecommendationSchema = z.object({
  kind: PremiumRecommendationKindSchema,
  title: z.string(),
  description: z.string(),
  userCardId: z.string().nullable(),
  cardName: z.string().nullable(),
  priorityRank: z.number().int().positive(),
  estimatedValueInr: z.number().nullable(),
});

export type PremiumRecommendation = z.infer<typeof PremiumRecommendationSchema>;

export const PremiumDashboardOverviewSchema = z.object({
  premiumCardCount: z.number().int().nonnegative(),
  totalAnnualFeesInr: z.number().min(0),
  totalWalletValueInr: z.number().min(0),
  totalEstimatedBenefitsInr: z.number().min(0),
  totalAnnualSavingsInr: z.number(),
  portfolioNetRoiInr: z.number(),
  averageRewardEfficiencyPercent: z.number().min(0),
  bestRoiCardUserCardId: z.string().nullable(),
  cards: z.array(PremiumCardRoiSchema),
  recommendations: z.array(PremiumRecommendationSchema),
  summary: z.string(),
  periodLabel: z.string(),
});

export type PremiumDashboardOverview = z.infer<typeof PremiumDashboardOverviewSchema>;
