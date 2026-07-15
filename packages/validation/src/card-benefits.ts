import { z } from 'zod';

export const CARD_BENEFIT_SECTION_CODES = [
  'LOUNGE',
  'INSURANCE',
  'TRAVEL',
  'FUEL',
  'DINING',
  'REWARDS',
  'CASHBACK',
  'WELCOME',
  'ENTERTAINMENT',
  'SHOPPING',
  'EMI',
  'FEES',
  'ELIGIBILITY',
  'APPROVAL',
  'OTHER',
] as const;

export type CardBenefitSectionCode = (typeof CARD_BENEFIT_SECTION_CODES)[number];

export const CARD_BENEFIT_SECTION_LABELS: Record<CardBenefitSectionCode, string> = {
  LOUNGE: 'Lounge access',
  INSURANCE: 'Insurance & protection',
  TRAVEL: 'Travel',
  FUEL: 'Fuel',
  DINING: 'Dining',
  REWARDS: 'Rewards',
  CASHBACK: 'Cashback',
  WELCOME: 'Welcome offers',
  ENTERTAINMENT: 'Entertainment',
  SHOPPING: 'Shopping & offers',
  EMI: 'EMI & interest',
  FEES: 'Fees & charges',
  ELIGIBILITY: 'Eligibility',
  APPROVAL: 'How to apply',
  OTHER: 'Other benefits',
};

export const CardBenefitItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  sectionCode: z.string(),
  sectionLabel: z.string(),
  sourceUrl: z.string().nullable(),
});

export type CardBenefitItem = z.infer<typeof CardBenefitItemSchema>;

export const CardBenefitSectionSchema = z.object({
  code: z.string(),
  label: z.string(),
  items: z.array(CardBenefitItemSchema),
});

export type CardBenefitSection = z.infer<typeof CardBenefitSectionSchema>;

export const CardRewardRuleSummarySchema = z.object({
  id: z.string(),
  ruleKey: z.string(),
  name: z.string(),
  spendCategoryCode: z.string().nullable(),
  rewardMultiplier: z.number().nullable(),
  cashbackPercent: z.number().nullable(),
  milestoneBonus: z.number().nullable(),
  spendThreshold: z.number().nullable(),
  capSummary: z.string().nullable(),
});

export type CardRewardRuleSummary = z.infer<typeof CardRewardRuleSummarySchema>;

export const CardMilestonePreviewSchema = z.object({
  id: z.string(),
  label: z.string(),
  spendThreshold: z.number().nullable(),
  milestoneBonus: z.number().nullable(),
  sourceRuleName: z.string(),
});

export type CardMilestonePreview = z.infer<typeof CardMilestonePreviewSchema>;

export const CardOfferSummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  cashbackPercent: z.number().nullable(),
  validUntil: z.string().datetime().nullable(),
  status: z.string(),
});

export type CardOfferSummary = z.infer<typeof CardOfferSummarySchema>;

export const CardAnnualFeeSummarySchema = z.object({
  annualFeeInr: z.number().nullable(),
  joiningFeeInr: z.number().nullable(),
  fees: z.array(
    z.object({
      id: z.string(),
      feeType: z.string(),
      amountInr: z.number().nullable(),
      waiverConditions: z.string().nullable(),
    }),
  ),
  feeBenefits: z.array(CardBenefitItemSchema),
});

export type CardAnnualFeeSummary = z.infer<typeof CardAnnualFeeSummarySchema>;

export const CardWalletSnapshotSchema = z.object({
  totalEstimatedValueInr: z.number().min(0),
  expiringSoonCount: z.number().int().nonnegative(),
  lastSyncedAt: z.string().datetime().nullable(),
});

export type CardWalletSnapshot = z.infer<typeof CardWalletSnapshotSchema>;

export const CardRecommendationHistoryItemSchema = z.object({
  id: z.string(),
  merchantName: z.string().nullable(),
  amountInr: z.number(),
  expectedRewardInr: z.number().nullable(),
  createdAt: z.string().datetime(),
  wasRecommended: z.boolean(),
});

export type CardRecommendationHistoryItem = z.infer<typeof CardRecommendationHistoryItemSchema>;

export const CardBenefitsOverviewSchema = z.object({
  userCardId: z.string(),
  creditCardId: z.string(),
  cardName: z.string(),
  nickname: z.string().nullable(),
  bankName: z.string(),
  bankSlug: z.string(),
  cardSlug: z.string(),
  networkName: z.string(),
  tier: z.string(),
  status: z.string(),
  isFavorite: z.boolean(),
  sourceUrl: z.string().nullable(),
  statementDay: z.number().nullable(),
  dueDay: z.number().nullable(),
  rewardProgramName: z.string().nullable(),
  pointValueInr: z.number().nullable(),
  benefitCount: z.number().int().nonnegative(),
  wallet: CardWalletSnapshotSchema.nullable(),
});

export type CardBenefitsOverview = z.infer<typeof CardBenefitsOverviewSchema>;

export const CardBenefitsDashboardSchema = z.object({
  overview: CardBenefitsOverviewSchema,
  benefitSections: z.array(CardBenefitSectionSchema),
  rewardRules: z.array(CardRewardRuleSummarySchema),
  milestones: z.array(CardMilestonePreviewSchema),
  offers: z.array(CardOfferSummarySchema),
  loungeAccess: z.array(CardBenefitItemSchema),
  insurance: z.array(CardBenefitItemSchema),
  annualFee: CardAnnualFeeSummarySchema,
  recommendationHistory: z.array(CardRecommendationHistoryItemSchema),
});

export type CardBenefitsDashboard = z.infer<typeof CardBenefitsDashboardSchema>;
