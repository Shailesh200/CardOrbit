import { z } from 'zod';

import { CardBenefitItemSchema } from './card-benefits';
import { RewardBalanceKindSchema } from './reward-wallet';

export const TravelMilesBalanceSchema = z.object({
  userCardId: z.string(),
  cardName: z.string(),
  bankName: z.string(),
  kind: RewardBalanceKindSchema,
  availableAmount: z.number().min(0),
  estimatedValueInr: z.number().min(0).nullable(),
  expiringAmount: z.number().min(0),
  expiringAt: z.string().datetime().nullable(),
});

export type TravelMilesBalance = z.infer<typeof TravelMilesBalanceSchema>;

export const TravelLoungeBenefitSchema = CardBenefitItemSchema.extend({
  allowanceLabel: z.string().nullable(),
  unlimited: z.boolean(),
});

export type TravelLoungeBenefit = z.infer<typeof TravelLoungeBenefitSchema>;

export const TravelCardProfileSchema = z.object({
  userCardId: z.string(),
  creditCardId: z.string(),
  cardName: z.string(),
  bankName: z.string(),
  networkName: z.string(),
  tier: z.string().nullable(),
  loungeSummary: z.string().nullable(),
  travelSummary: z.string().nullable(),
  loungeBenefits: z.array(TravelLoungeBenefitSchema),
  travelBenefits: z.array(CardBenefitItemSchema),
  travelInsurance: z.array(CardBenefitItemSchema),
  milesBalances: z.array(TravelMilesBalanceSchema),
  travelRewardRules: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      rewardMultiplier: z.number().nullable(),
      cashbackPercent: z.number().nullable(),
      spendCategoryCode: z.string().nullable(),
    }),
  ),
});

export type TravelCardProfile = z.infer<typeof TravelCardProfileSchema>;

export const TravelOfferSummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  cardName: z.string(),
  validUntil: z.string().datetime().nullable(),
});

export type TravelOfferSummary = z.infer<typeof TravelOfferSummarySchema>;

export const TravelSpendingSummarySchema = z.object({
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

export type TravelSpendingSummary = z.infer<typeof TravelSpendingSummarySchema>;

export const TravelHubOverviewSchema = z.object({
  cardCount: z.number().int().nonnegative(),
  loungeCardCount: z.number().int().nonnegative(),
  totalMiles: z.number().min(0),
  totalHotelPoints: z.number().min(0),
  totalMilesValueInr: z.number().min(0),
  travelOfferCount: z.number().int().nonnegative(),
  bestTravelCardUserCardId: z.string().nullable(),
  cards: z.array(TravelCardProfileSchema),
  travelOffers: z.array(TravelOfferSummarySchema),
  spending: TravelSpendingSummarySchema,
});

export type TravelHubOverview = z.infer<typeof TravelHubOverviewSchema>;

export const TravelLoungeOverviewSchema = z.object({
  cards: z.array(TravelCardProfileSchema),
  totalLoungePrograms: z.number().int().nonnegative(),
});

export type TravelLoungeOverview = z.infer<typeof TravelLoungeOverviewSchema>;

export const TravelMilesOverviewSchema = z.object({
  totalMiles: z.number().min(0),
  totalHotelPoints: z.number().min(0),
  totalEstimatedValueInr: z.number().min(0),
  balances: z.array(TravelMilesBalanceSchema),
});

export type TravelMilesOverview = z.infer<typeof TravelMilesOverviewSchema>;
