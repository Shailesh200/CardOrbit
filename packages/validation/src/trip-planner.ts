import { z } from 'zod';

export const TripScopeSchema = z.enum(['DOMESTIC', 'INTERNATIONAL']);
export type TripScope = z.infer<typeof TripScopeSchema>;

export const TripSpendCategorySchema = z.enum(['FLIGHTS', 'HOTELS', 'DINING', 'TRANSPORT']);
export type TripSpendCategory = z.infer<typeof TripSpendCategorySchema>;

export const TRIP_SPEND_CATEGORY_LABELS: Record<TripSpendCategory, string> = {
  FLIGHTS: 'Flights',
  HOTELS: 'Hotels',
  DINING: 'Dining',
  TRANSPORT: 'Local transport',
};

export const TripPlanInputSchema = z
  .object({
    destination: z.string().trim().min(2).max(120),
    startDate: z.string().date(),
    endDate: z.string().date(),
    budgetInr: z.coerce.number().positive().max(50_000_000),
    preferredAirline: z.string().trim().min(2).max(80).optional(),
    preferredHotel: z.string().trim().min(2).max(80).optional(),
  })
  .refine((value) => value.endDate >= value.startDate, {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });

export type TripPlanInput = z.infer<typeof TripPlanInputSchema>;

export const TripBudgetBreakdownSchema = z.object({
  flightsInr: z.number().min(0),
  hotelsInr: z.number().min(0),
  diningInr: z.number().min(0),
  transportInr: z.number().min(0),
});

export type TripBudgetBreakdown = z.infer<typeof TripBudgetBreakdownSchema>;

export const TripCardPickSchema = z.object({
  userCardId: z.string(),
  cardName: z.string(),
  bankName: z.string(),
  expectedRewardInr: z.number().min(0),
  estimatedPoints: z.number().min(0),
  effectiveRatePercent: z.number().min(0),
  rationale: z.string(),
});

export type TripCardPick = z.infer<typeof TripCardPickSchema>;

export const TripCategoryRecommendationSchema = z.object({
  category: TripSpendCategorySchema,
  categoryLabel: z.string(),
  spendAmountInr: z.number().min(0),
  recommendedCard: TripCardPickSchema.nullable(),
  alternatives: z.array(TripCardPickSchema),
});

export type TripCategoryRecommendation = z.infer<typeof TripCategoryRecommendationSchema>;

export const TripLoungeEligibilitySchema = z.object({
  userCardId: z.string(),
  cardName: z.string(),
  bankName: z.string(),
  eligible: z.boolean(),
  loungeSummary: z.string().nullable(),
  scopeNote: z.string(),
});

export type TripLoungeEligibility = z.infer<typeof TripLoungeEligibilitySchema>;

export const TripTravelBenefitHighlightSchema = z.object({
  userCardId: z.string(),
  cardName: z.string(),
  bankName: z.string(),
  title: z.string(),
  description: z.string().nullable(),
});

export type TripTravelBenefitHighlight = z.infer<typeof TripTravelBenefitHighlightSchema>;

export const TripRewardOpportunitySchema = z.object({
  kind: z.enum(['EARN', 'REDEEM', 'OFFER']),
  title: z.string(),
  description: z.string(),
  userCardId: z.string().nullable(),
  cardName: z.string().nullable(),
  estimatedValueInr: z.number().min(0).nullable(),
  priorityRank: z.number().int().positive(),
});

export type TripRewardOpportunity = z.infer<typeof TripRewardOpportunitySchema>;

export const TripPlanResultSchema = z.object({
  destination: z.string(),
  tripDays: z.number().int().positive(),
  scope: TripScopeSchema,
  budgetInr: z.number().min(0),
  budgetBreakdown: TripBudgetBreakdownSchema,
  recommendedCards: z.array(TripCategoryRecommendationSchema),
  totalEstimatedPoints: z.number().min(0),
  totalEstimatedValueInr: z.number().min(0),
  loungeEligibility: z.array(TripLoungeEligibilitySchema),
  travelBenefits: z.array(TripTravelBenefitHighlightSchema),
  rewardOpportunities: z.array(TripRewardOpportunitySchema),
  summary: z.string(),
  preferredProgramMatches: z.object({
    airline: z.string().nullable(),
    hotel: z.string().nullable(),
  }),
});

export type TripPlanResult = z.infer<typeof TripPlanResultSchema>;

export function parseTripPlanInput(raw: unknown): TripPlanInput {
  return TripPlanInputSchema.parse(raw);
}
