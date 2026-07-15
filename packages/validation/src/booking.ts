import { z } from 'zod';

export const BookingProductSchema = z.enum(['FLIGHT', 'HOTEL']);
export type BookingProduct = z.infer<typeof BookingProductSchema>;

export const BookingCabinClassSchema = z.enum(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST']);
export type BookingCabinClass = z.infer<typeof BookingCabinClassSchema>;

export const BookingPassengersSchema = z.object({
  adults: z.number().int().min(1).max(9).default(1),
  children: z.number().int().min(0).max(8).default(0),
  infants: z.number().int().min(0).max(4).default(0),
});

export type BookingPassengers = z.infer<typeof BookingPassengersSchema>;

export const BookingFlightSearchInputSchema = z.object({
  origin: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toUpperCase()),
  destination: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toUpperCase()),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  returnDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  tripType: z.enum(['ONE_WAY', 'ROUND_TRIP']).default('ONE_WAY'),
  passengers: BookingPassengersSchema.default({ adults: 1, children: 0, infants: 0 }),
  cabinClass: BookingCabinClassSchema.default('ECONOMY'),
  maxStops: z.number().int().min(0).max(2).optional(),
  preferredAirlines: z.array(z.string().trim().min(1)).max(8).optional(),
  sortBy: z.enum(['EFFECTIVE_COST', 'DURATION', 'DEPARTURE', 'BEST']).default('BEST'),
  userCardId: z.string().trim().min(1).optional(),
});

export type BookingFlightSearchInput = z.infer<typeof BookingFlightSearchInputSchema>;

export const BookingRoomTypeSchema = z.enum(['STANDARD', 'DELUXE', 'SUITE']);
export type BookingRoomType = z.infer<typeof BookingRoomTypeSchema>;

export const BookingMealPlanSchema = z.enum(['ROOM_ONLY', 'BREAKFAST', 'HALF_BOARD']);
export type BookingMealPlan = z.infer<typeof BookingMealPlanSchema>;

export const BookingCancellationPolicySchema = z.enum(['FREE_24H', 'MODERATE', 'NON_REFUNDABLE']);
export type BookingCancellationPolicy = z.infer<typeof BookingCancellationPolicySchema>;

export const BookingHotelSearchInputSchema = z.object({
  destination: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .transform((value) => value.toUpperCase()),
  checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.number().int().min(1).max(8).default(2),
  rooms: z.number().int().min(1).max(4).default(1),
  minStarRating: z.number().int().min(1).max(5).optional(),
  preferredChains: z.array(z.string().trim().min(1)).max(8).optional(),
  mealPlan: BookingMealPlanSchema.optional(),
  sortBy: z.enum(['EFFECTIVE_COST', 'STAR_RATING', 'LOYALTY', 'BEST']).default('BEST'),
  userCardId: z.string().trim().min(1).optional(),
});

export type BookingHotelSearchInput = z.infer<typeof BookingHotelSearchInputSchema>;

export const BookingSearchInputSchema = z.object({
  product: BookingProductSchema.default('FLIGHT'),
  origin: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toUpperCase())
    .optional(),
  destination: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .transform((value) => value.toUpperCase())
    .optional(),
  departureDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  returnDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  passengers: BookingPassengersSchema.default({ adults: 1, children: 0, infants: 0 }),
  cabinClass: BookingCabinClassSchema.default('ECONOMY'),
  userCardId: z.string().trim().min(1).optional(),
  checkInDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  checkOutDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  guests: z.number().int().min(1).max(8).optional(),
  rooms: z.number().int().min(1).max(4).optional(),
  minStarRating: z.number().int().min(1).max(5).optional(),
  preferredChains: z.array(z.string().trim().min(1)).max(8).optional(),
  mealPlan: BookingMealPlanSchema.optional(),
  sortBy: z
    .enum(['EFFECTIVE_COST', 'DURATION', 'DEPARTURE', 'STAR_RATING', 'LOYALTY', 'BEST'])
    .optional(),
});

export type BookingSearchInput = z.infer<typeof BookingSearchInputSchema>;

export const BookingPricingLineSchema = z.object({
  code: z.string(),
  label: z.string(),
  amountInr: z.number(),
});

export type BookingPricingLine = z.infer<typeof BookingPricingLineSchema>;

export const BookingPricingBreakdownSchema = z.object({
  currency: z.literal('INR'),
  baseFareInr: z.number().nonnegative(),
  taxesInr: z.number().nonnegative(),
  feesInr: z.number().nonnegative(),
  ancillariesInr: z.number().nonnegative(),
  grossPriceInr: z.number().nonnegative(),
  cashbackInr: z.number().nonnegative(),
  rewardValueInr: z.number().nonnegative(),
  offerSavingsInr: z.number().nonnegative(),
  effectiveCostInr: z.number(),
  lines: z.array(BookingPricingLineSchema),
});

export type BookingPricingBreakdown = z.infer<typeof BookingPricingBreakdownSchema>;

export const BookingExplanationFactorSchema = z.object({
  code: z.string(),
  label: z.string(),
  detail: z.string(),
  impactInr: z.number().nullable(),
});

export type BookingExplanationFactor = z.infer<typeof BookingExplanationFactorSchema>;

export const BookingFareFamilySchema = z.enum(['BASIC', 'FLEX', 'PLUS']);
export type BookingFareFamily = z.infer<typeof BookingFareFamilySchema>;

export const BookingAvailabilityStateSchema = z.enum([
  'AVAILABLE',
  'LIMITED',
  'WAITLIST',
  'UNAVAILABLE',
]);
export type BookingAvailabilityState = z.infer<typeof BookingAvailabilityStateSchema>;

export const BookingRankingScoresSchema = z.object({
  overall: z.number(),
  price: z.number(),
  convenience: z.number(),
  reward: z.number(),
});

export type BookingRankingScores = z.infer<typeof BookingRankingScoresSchema>;

export const BookingOfferSchema = z.object({
  id: z.string(),
  product: BookingProductSchema,
  supplierCode: z.string(),
  title: z.string(),
  summary: z.string(),
  airlineOrProperty: z.string(),
  departureAt: z.string().nullable(),
  arrivalAt: z.string().nullable(),
  durationMinutes: z.number().int().nonnegative().nullable(),
  stops: z.number().int().nonnegative().nullable(),
  cabinClass: BookingCabinClassSchema.nullable(),
  baggageIncluded: z.boolean(),
  loungeEligible: z.boolean(),
  flightNumber: z.string().nullable().optional(),
  fareFamily: BookingFareFamilySchema.nullable().optional(),
  fareBasis: z.string().nullable().optional(),
  seatsRemaining: z.number().int().nonnegative().nullable().optional(),
  availabilityState: BookingAvailabilityStateSchema.nullable().optional(),
  tripType: z.enum(['ONE_WAY', 'ROUND_TRIP']).nullable().optional(),
  starRating: z.number().int().min(1).max(5).nullable().optional(),
  roomType: BookingRoomTypeSchema.nullable().optional(),
  mealPlan: BookingMealPlanSchema.nullable().optional(),
  cancellationPolicy: BookingCancellationPolicySchema.nullable().optional(),
  loyaltyProgram: z.string().nullable().optional(),
  chainCode: z.string().nullable().optional(),
  roomsRemaining: z.number().int().nonnegative().nullable().optional(),
  nightlyRateInr: z.number().nonnegative().nullable().optional(),
  estimatedLoyaltyPoints: z.number().nonnegative().nullable().optional(),
  rankingScores: BookingRankingScoresSchema.nullable().optional(),
  recommendationReason: z.string().nullable().optional(),
  pricing: BookingPricingBreakdownSchema,
  explanations: z.array(BookingExplanationFactorSchema),
  recommendedUserCardId: z.string().nullable(),
  recommendedCardName: z.string().nullable(),
  rank: z.number().int().positive(),
});

export type BookingOffer = z.infer<typeof BookingOfferSchema>;

export const BookingSearchResultSchema = z.object({
  searchId: z.string(),
  product: BookingProductSchema,
  query: z.record(z.string(), z.unknown()),
  offerCount: z.number().int().nonnegative(),
  offers: z.array(BookingOfferSchema),
  suppliersQueried: z.array(z.string()),
  generatedAt: z.string().datetime(),
});

export type BookingSearchResult = z.infer<typeof BookingSearchResultSchema>;

export const BookingPricingInputSchema = z.object({
  offerId: z.string().min(1),
  searchId: z.string().min(1).optional(),
  userCardId: z.string().trim().min(1).optional(),
  grossPriceInr: z.number().positive().optional(),
  product: BookingProductSchema.default('FLIGHT'),
});

export type BookingPricingInput = z.infer<typeof BookingPricingInputSchema>;

export const BookingPricingResultSchema = z.object({
  offerId: z.string(),
  pricing: BookingPricingBreakdownSchema,
  explanations: z.array(BookingExplanationFactorSchema),
  recommendedUserCardId: z.string().nullable(),
  recommendedCardName: z.string().nullable(),
});

export type BookingPricingResult = z.infer<typeof BookingPricingResultSchema>;

export const BookingHubSchema = z.object({
  enabled: z.boolean(),
  supportedProducts: z.array(BookingProductSchema),
  lifecycleStages: z.array(z.string()),
  suppliers: z.array(
    z.object({
      code: z.string(),
      name: z.string(),
      products: z.array(BookingProductSchema),
      status: z.enum(['MOCK', 'LIVE', 'DISABLED']),
    }),
  ),
  notes: z.array(z.string()),
});

export type BookingHub = z.infer<typeof BookingHubSchema>;

/** Issuer travel portal channels (SmartBuy, etc.) — handoff, not embedded inventory. */
export const BookingChannelKindSchema = z.enum(['DIRECT', 'PORTAL_HANDOFF']);
export type BookingChannelKind = z.infer<typeof BookingChannelKindSchema>;

export const BookingChannelStatusSchema = z.enum(['ACTIVE', 'DEPRECATED']);
export type BookingChannelStatus = z.infer<typeof BookingChannelStatusSchema>;

export const BookingAccelerationRuleSchema = z.object({
  /** Reward multiplier when booking on this portal (e.g. 10 = 10X). */
  multiplier: z.number().positive(),
  /** Baseline multiplier on a generic OTA for comparison (e.g. 2). */
  baselineMultiplier: z.number().positive().default(2),
  /** INR value per reward point/mile unit for estimates. */
  pointValueInr: z.number().nonnegative().default(0.2),
  /** Assumed points per ₹100 of spend at 1X. */
  pointsPerHundredInr: z.number().positive().default(2),
  category: z.enum(['FLIGHT', 'HOTEL', 'TRAVEL']).default('TRAVEL'),
  summary: z.string().min(1),
  eligibilityNotes: z.string().nullable().optional(),
});

export type BookingAccelerationRule = z.infer<typeof BookingAccelerationRuleSchema>;

export const IssuerTravelPortalSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  bankSlug: z.string().min(1),
  bankName: z.string().min(1),
  kind: z.literal('PORTAL_HANDOFF'),
  status: BookingChannelStatusSchema,
  products: z.array(BookingProductSchema).min(1),
  baseUrl: z.string().url(),
  /** Hostnames for extension domain matching (no protocol). */
  domains: z.array(z.string().min(1)).min(1),
  /**
   * Deep-link template. Supports tokens:
   * {origin} {destination} {departureDate} {returnDate} {product}
   * Missing tokens are omitted; if URL has no usable query, falls back to baseUrl.
   */
  deepLinkTemplate: z.string().min(1).nullable(),
  /** Card name keywords / tier labels used to match portfolio cards. */
  supportedCardHints: z.array(z.string()).default([]),
  acceleration: BookingAccelerationRuleSchema,
  eligibilityNotes: z.string().nullable().optional(),
});

export type IssuerTravelPortal = z.infer<typeof IssuerTravelPortalSchema>;

export const BookingChannelRecommendInputSchema = z.object({
  product: BookingProductSchema.default('FLIGHT'),
  origin: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toUpperCase())
    .optional(),
  destination: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .transform((value) => value.toUpperCase())
    .optional(),
  departureDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  returnDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  checkInDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  checkOutDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  /** Optional sticker/gross fare estimate for value math (defaults applied server-side). */
  estimatedGrossInr: z.number().positive().optional(),
  /** Lowest CardWise-channel effective cost when available (for side-by-side ranking). */
  directEffectiveCostInr: z.number().optional(),
  userCardId: z.string().trim().min(1).optional(),
});

export type BookingChannelRecommendInput = z.infer<typeof BookingChannelRecommendInputSchema>;

export const BookingChannelRecommendationSchema = z.object({
  channelId: z.string(),
  slug: z.string(),
  name: z.string(),
  bankName: z.string(),
  kind: BookingChannelKindSchema,
  product: BookingProductSchema,
  rank: z.number().int().positive(),
  requiresExternalBooking: z.boolean(),
  deepLinkUrl: z.string().url(),
  searchHint: z.string().nullable(),
  accelerationSummary: z.string(),
  estimatedGrossInr: z.number().nonnegative(),
  estimatedRewardValueInr: z.number().nonnegative(),
  estimatedEffectiveCostInr: z.number(),
  /** Extra value vs baseline OTA earn on the same sticker fare. */
  estimatedAccelerationLiftInr: z.number(),
  recommendedUserCardId: z.string().nullable(),
  recommendedCardName: z.string().nullable(),
  portfolioMatch: z.boolean(),
  explanations: z.array(BookingExplanationFactorSchema),
  eligibilityNotes: z.string().nullable(),
});

export type BookingChannelRecommendation = z.infer<typeof BookingChannelRecommendationSchema>;

export const BookingChannelRecommendResultSchema = z.object({
  product: BookingProductSchema,
  estimatedGrossInr: z.number().nonnegative(),
  channelCount: z.number().int().nonnegative(),
  channels: z.array(BookingChannelRecommendationSchema),
  directChannel: BookingChannelRecommendationSchema.nullable(),
  disclosure: z.string(),
  generatedAt: z.string().datetime(),
});

export type BookingChannelRecommendResult = z.infer<typeof BookingChannelRecommendResultSchema>;

export const BookingPortalHandoffInputSchema = z.object({
  channelId: z.string().min(1),
  slug: z.string().min(1).optional(),
  product: BookingProductSchema.default('FLIGHT'),
  deepLinkUrl: z.string().url().optional(),
});

export type BookingPortalHandoffInput = z.infer<typeof BookingPortalHandoffInputSchema>;

export const BookingPortalHandoffResultSchema = z.object({
  ok: z.boolean(),
  channelId: z.string(),
  deepLinkUrl: z.string().url(),
});

export type BookingPortalHandoffResult = z.infer<typeof BookingPortalHandoffResultSchema>;

export const BookingFareValidateOutcomeSchema = z.enum([
  'VALID',
  'PRICE_INCREASED',
  'PRICE_DECREASED',
  'LIMITED',
  'UNAVAILABLE',
]);
export type BookingFareValidateOutcome = z.infer<typeof BookingFareValidateOutcomeSchema>;

export const BookingFlightAvailabilityInputSchema = z.object({
  offerId: z.string().min(1),
  searchId: z.string().min(1).optional(),
});
export type BookingFlightAvailabilityInput = z.infer<typeof BookingFlightAvailabilityInputSchema>;

export const BookingFlightAvailabilityResultSchema = z.object({
  offerId: z.string(),
  state: BookingAvailabilityStateSchema,
  seatsRemaining: z.number().int().nonnegative().nullable(),
  detail: z.string(),
});
export type BookingFlightAvailabilityResult = z.infer<typeof BookingFlightAvailabilityResultSchema>;

export const BookingFareValidateInputSchema = z.object({
  offerId: z.string().min(1),
  searchId: z.string().min(1).optional(),
  grossPriceInr: z.number().positive().optional(),
  product: BookingProductSchema.default('FLIGHT'),
});
export type BookingFareValidateInput = z.infer<typeof BookingFareValidateInputSchema>;

export const BookingFareValidateResultSchema = z.object({
  offerId: z.string(),
  outcome: BookingFareValidateOutcomeSchema,
  previousGrossInr: z.number().nonnegative(),
  currentGrossInr: z.number().nonnegative(),
  priceDeltaInr: z.number(),
  pricing: BookingPricingBreakdownSchema,
  explanations: z.array(BookingExplanationFactorSchema),
  detail: z.string(),
});
export type BookingFareValidateResult = z.infer<typeof BookingFareValidateResultSchema>;

export const BookingPaymentOptimizeInputSchema = z.object({
  offerId: z.string().min(1).optional(),
  product: BookingProductSchema.default('FLIGHT'),
  grossPriceInr: z.number().positive(),
  userCardId: z.string().trim().min(1).optional(),
});
export type BookingPaymentOptimizeInput = z.infer<typeof BookingPaymentOptimizeInputSchema>;

export const BookingPaymentCardOptionSchema = z.object({
  userCardId: z.string(),
  cardName: z.string(),
  bankName: z.string(),
  rank: z.number().int().positive(),
  cashbackInr: z.number().nonnegative(),
  rewardValueInr: z.number().nonnegative(),
  effectiveCostInr: z.number(),
  selected: z.boolean(),
  explanations: z.array(BookingExplanationFactorSchema),
});
export type BookingPaymentCardOption = z.infer<typeof BookingPaymentCardOptionSchema>;

export const BookingPaymentOptimizeResultSchema = z.object({
  offerId: z.string().nullable(),
  product: BookingProductSchema,
  grossPriceInr: z.number().nonnegative(),
  cardCount: z.number().int().nonnegative(),
  cards: z.array(BookingPaymentCardOptionSchema),
  recommendedUserCardId: z.string().nullable(),
  recommendedCardName: z.string().nullable(),
});
export type BookingPaymentOptimizeResult = z.infer<typeof BookingPaymentOptimizeResultSchema>;

export const BookingHotelAvailabilityInputSchema = z.object({
  offerId: z.string().min(1),
  searchId: z.string().min(1).optional(),
});
export type BookingHotelAvailabilityInput = z.infer<typeof BookingHotelAvailabilityInputSchema>;

export const BookingHotelAvailabilityResultSchema = z.object({
  offerId: z.string(),
  state: BookingAvailabilityStateSchema,
  roomsRemaining: z.number().int().nonnegative().nullable(),
  detail: z.string(),
});
export type BookingHotelAvailabilityResult = z.infer<typeof BookingHotelAvailabilityResultSchema>;

export const BookingRateValidateInputSchema = z.object({
  offerId: z.string().min(1),
  searchId: z.string().min(1).optional(),
  grossPriceInr: z.number().positive().optional(),
  product: z.literal('HOTEL').default('HOTEL'),
});
export type BookingRateValidateInput = z.infer<typeof BookingRateValidateInputSchema>;

/** Rate validate reuses fare-validate outcome shape for consistent UX. */
export const BookingRateValidateResultSchema = BookingFareValidateResultSchema;
export type BookingRateValidateResult = BookingFareValidateResult;

export const BookingLoyaltyPathSchema = z.enum([
  'CARD_CASH_REWARDS',
  'CHAIN_LOYALTY_EARN',
  'PORTAL_ACCELERATION',
  'CHAIN_POINTS_REDEEM',
]);
export type BookingLoyaltyPath = z.infer<typeof BookingLoyaltyPathSchema>;

export const BookingLoyaltyOptimizeInputSchema = z.object({
  offerId: z.string().min(1).optional(),
  searchId: z.string().min(1).optional(),
  grossPriceInr: z.number().positive(),
  loyaltyProgram: z.string().trim().min(1).optional(),
  estimatedLoyaltyPoints: z.number().nonnegative().optional(),
  chainCode: z.string().trim().min(1).optional(),
  userCardId: z.string().trim().min(1).optional(),
});
export type BookingLoyaltyOptimizeInput = z.infer<typeof BookingLoyaltyOptimizeInputSchema>;

export const BookingLoyaltyOptionSchema = z.object({
  path: BookingLoyaltyPathSchema,
  label: z.string(),
  rank: z.number().int().positive(),
  estimatedRewardValueInr: z.number().nonnegative(),
  estimatedEffectiveCostInr: z.number(),
  selected: z.boolean(),
  detail: z.string(),
  explanations: z.array(BookingExplanationFactorSchema),
});
export type BookingLoyaltyOption = z.infer<typeof BookingLoyaltyOptionSchema>;

export const BookingLoyaltyOptimizeResultSchema = z.object({
  offerId: z.string().nullable(),
  grossPriceInr: z.number().nonnegative(),
  pathCount: z.number().int().nonnegative(),
  paths: z.array(BookingLoyaltyOptionSchema),
  recommendedPath: BookingLoyaltyPathSchema.nullable(),
  recommendedLabel: z.string().nullable(),
});
export type BookingLoyaltyOptimizeResult = z.infer<typeof BookingLoyaltyOptimizeResultSchema>;

export function parseBookingFlightSearchInput(input: unknown): BookingFlightSearchInput {
  return BookingFlightSearchInputSchema.parse(input ?? {});
}

export function parseBookingHotelSearchInput(input: unknown): BookingHotelSearchInput {
  return BookingHotelSearchInputSchema.parse(input ?? {});
}

export function parseBookingSearchInput(input: unknown): BookingSearchInput {
  return BookingSearchInputSchema.parse(input ?? {});
}

export function parseBookingPricingInput(input: unknown): BookingPricingInput {
  return BookingPricingInputSchema.parse(input ?? {});
}

export function parseBookingChannelRecommendInput(input: unknown): BookingChannelRecommendInput {
  return BookingChannelRecommendInputSchema.parse(input ?? {});
}

export function parseBookingPortalHandoffInput(input: unknown): BookingPortalHandoffInput {
  return BookingPortalHandoffInputSchema.parse(input ?? {});
}

export function parseIssuerTravelPortal(input: unknown): IssuerTravelPortal {
  return IssuerTravelPortalSchema.parse(input);
}

export function parseBookingFlightAvailabilityInput(
  input: unknown,
): BookingFlightAvailabilityInput {
  return BookingFlightAvailabilityInputSchema.parse(input ?? {});
}

export function parseBookingFareValidateInput(input: unknown): BookingFareValidateInput {
  return BookingFareValidateInputSchema.parse(input ?? {});
}

export function parseBookingPaymentOptimizeInput(input: unknown): BookingPaymentOptimizeInput {
  return BookingPaymentOptimizeInputSchema.parse(input ?? {});
}

export function parseBookingHotelAvailabilityInput(input: unknown): BookingHotelAvailabilityInput {
  return BookingHotelAvailabilityInputSchema.parse(input ?? {});
}

export function parseBookingRateValidateInput(input: unknown): BookingRateValidateInput {
  return BookingRateValidateInputSchema.parse(input ?? {});
}

export function parseBookingLoyaltyOptimizeInput(input: unknown): BookingLoyaltyOptimizeInput {
  return BookingLoyaltyOptimizeInputSchema.parse(input ?? {});
}
