import { z } from 'zod';

import { CardBenefitItemSchema } from './card-benefits';

export const LifestyleCoverageTypeSchema = z.enum(['TRAVEL', 'MEDICAL', 'PURCHASE', 'GENERAL']);
export type LifestyleCoverageType = z.infer<typeof LifestyleCoverageTypeSchema>;

export const LifestyleInsuranceBenefitSchema = CardBenefitItemSchema.extend({
  coverageLabel: z.string().nullable(),
  coverageType: LifestyleCoverageTypeSchema.nullable(),
});

export type LifestyleInsuranceBenefit = z.infer<typeof LifestyleInsuranceBenefitSchema>;

export const LifestyleFuelBenefitSchema = CardBenefitItemSchema.extend({
  surchargeWaiver: z.boolean(),
  waiverCapLabel: z.string().nullable(),
});

export type LifestyleFuelBenefit = z.infer<typeof LifestyleFuelBenefitSchema>;

export const LifestyleDiningBenefitSchema = CardBenefitItemSchema.extend({
  discountPercent: z.number().min(0).max(100).nullable(),
  programName: z.string().nullable(),
});

export type LifestyleDiningBenefit = z.infer<typeof LifestyleDiningBenefitSchema>;

export const LifestyleEmiBenefitSchema = CardBenefitItemSchema.extend({
  noCostEmi: z.boolean(),
  interestRateLabel: z.string().nullable(),
  maxTenureMonths: z.number().int().positive().nullable(),
});

export type LifestyleEmiBenefit = z.infer<typeof LifestyleEmiBenefitSchema>;

export const LifestyleCardProfileSchema = z.object({
  userCardId: z.string(),
  creditCardId: z.string(),
  cardName: z.string(),
  bankName: z.string(),
  networkName: z.string(),
  insuranceSummary: z.string().nullable(),
  fuelSummary: z.string().nullable(),
  diningSummary: z.string().nullable(),
  emiSummary: z.string().nullable(),
  insuranceBenefits: z.array(LifestyleInsuranceBenefitSchema),
  fuelBenefits: z.array(LifestyleFuelBenefitSchema),
  diningBenefits: z.array(LifestyleDiningBenefitSchema),
  emiBenefits: z.array(LifestyleEmiBenefitSchema),
  lifestyleRewardRules: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      spendCategoryCode: z.string().nullable(),
      rewardMultiplier: z.number().nullable(),
      cashbackPercent: z.number().nullable(),
    }),
  ),
});

export type LifestyleCardProfile = z.infer<typeof LifestyleCardProfileSchema>;

export const LifestyleSpendingSummarySchema = z.object({
  totalVolumeInr: z.number().min(0),
  transactionCount: z.number().int().nonnegative(),
  periodLabel: z.string(),
  topMerchants: z.array(
    z.object({
      merchantName: z.string(),
      volumeInr: z.number().min(0),
      count: z.number().int().nonnegative(),
    }),
  ),
});

export type LifestyleSpendingSummary = z.infer<typeof LifestyleSpendingSummarySchema>;

export const LifestyleBenefitsOverviewSchema = z.object({
  cardCount: z.number().int().nonnegative(),
  insuranceCardCount: z.number().int().nonnegative(),
  fuelCardCount: z.number().int().nonnegative(),
  diningCardCount: z.number().int().nonnegative(),
  emiCardCount: z.number().int().nonnegative(),
  bestFuelCardUserCardId: z.string().nullable(),
  bestDiningCardUserCardId: z.string().nullable(),
  cards: z.array(LifestyleCardProfileSchema),
  fuelSpending: LifestyleSpendingSummarySchema,
  diningSpending: LifestyleSpendingSummarySchema,
});

export type LifestyleBenefitsOverview = z.infer<typeof LifestyleBenefitsOverviewSchema>;

export const LifestyleSectionOverviewSchema = z.object({
  section: z.enum(['INSURANCE', 'FUEL', 'DINING', 'EMI']),
  cardCount: z.number().int().nonnegative(),
  cards: z.array(LifestyleCardProfileSchema),
});

export type LifestyleSectionOverview = z.infer<typeof LifestyleSectionOverviewSchema>;
