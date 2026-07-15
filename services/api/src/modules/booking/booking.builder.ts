import type {
  BookingExplanationFactor,
  BookingFlightSearchInput,
  BookingHotelSearchInput,
  BookingHub,
  BookingOffer,
  BookingPricingBreakdown,
  BookingPricingResult,
  BookingProduct,
  BookingSearchInput,
  BookingSearchResult,
} from '@cardwise/validation';

import type { SupplierRawOffer } from './booking.supplier';

export type BookingTravelContext = {
  bestTravelCardUserCardId: string | null;
  bestTravelCardName: string | null;
  loungeCardCount: number;
  travelOfferCount: number;
  /** Estimated cashback share of gross (e.g. 0.04 = 4%). */
  cashbackRate: number;
  /** Estimated reward value share of base fare. */
  rewardValueRate: number;
  /** Flat offer savings when travel offers exist. */
  offerSavingsCapInr: number;
};

const DEFAULT_CONTEXT: BookingTravelContext = {
  bestTravelCardUserCardId: null,
  bestTravelCardName: null,
  loungeCardCount: 0,
  travelOfferCount: 0,
  cashbackRate: 0.03,
  rewardValueRate: 0.04,
  offerSavingsCapInr: 0,
};

export type BookingSortBy =
  | 'EFFECTIVE_COST'
  | 'DURATION'
  | 'DEPARTURE'
  | 'STAR_RATING'
  | 'LOYALTY'
  | 'BEST';

export function buildBookingHub(supplier: {
  code: string;
  name: string;
  products: BookingProduct[];
}): BookingHub {
  return {
    enabled: true,
    supportedProducts: ['FLIGHT', 'HOTEL'],
    lifecycleStages: [
      'SEARCH',
      'PRICE',
      'RANK',
      'RESERVE',
      'PAY',
      'CONFIRM',
      'TICKET',
      'FULFILL',
      'POST_BOOKING',
    ],
    suppliers: [
      {
        code: supplier.code,
        name: supplier.name,
        products: [...supplier.products],
        status: 'MOCK',
      },
      {
        code: 'PORTAL_HANDOFF',
        name: 'Issuer travel portals',
        products: ['FLIGHT', 'HOTEL'],
        status: 'LIVE',
      },
    ],
    notes: [
      'M-054 foundation: supplier-agnostic search + explainable effective-cost pricing.',
      'M-055 flight depth: multi-supplier mock inventory, fare validation, payment-card optimization.',
      'M-056 hotel depth: multi-supplier properties, rate validation, loyalty-path optimization.',
      'Issuer portals (SmartBuy, Travel Edge, etc.) are PORTAL_HANDOFF channels — deep-link, not iframe.',
      'Effective cost = base + taxes/fees − cashback − reward value − offer savings.',
      'Portal rankings use acceleration rule estimates, not live bank inventory.',
    ],
  };
}

export function buildPricingBreakdown(
  raw: Pick<SupplierRawOffer, 'baseFareInr' | 'taxesInr' | 'feesInr' | 'ancillariesInr'>,
  context: BookingTravelContext = DEFAULT_CONTEXT,
): BookingPricingBreakdown {
  const baseFareInr = roundInr(raw.baseFareInr);
  const taxesInr = roundInr(raw.taxesInr);
  const feesInr = roundInr(raw.feesInr);
  const ancillariesInr = roundInr(raw.ancillariesInr);
  const grossPriceInr = roundInr(baseFareInr + taxesInr + feesInr + ancillariesInr);
  const cashbackInr = roundInr(grossPriceInr * context.cashbackRate);
  const rewardValueInr = roundInr(baseFareInr * context.rewardValueRate);
  const offerSavingsInr =
    context.travelOfferCount > 0
      ? roundInr(Math.min(context.offerSavingsCapInr, grossPriceInr * 0.05))
      : 0;
  const effectiveCostInr = roundInr(grossPriceInr - cashbackInr - rewardValueInr - offerSavingsInr);

  return {
    currency: 'INR',
    baseFareInr,
    taxesInr,
    feesInr,
    ancillariesInr,
    grossPriceInr,
    cashbackInr,
    rewardValueInr,
    offerSavingsInr,
    effectiveCostInr,
    lines: [
      { code: 'BASE', label: 'Base fare', amountInr: baseFareInr },
      { code: 'TAXES', label: 'Taxes', amountInr: taxesInr },
      { code: 'FEES', label: 'Fees', amountInr: feesInr },
      ...(ancillariesInr > 0
        ? [{ code: 'ANCILLARIES', label: 'Ancillaries', amountInr: ancillariesInr }]
        : []),
      { code: 'GROSS', label: 'Gross price', amountInr: grossPriceInr },
      { code: 'CASHBACK', label: 'Est. cashback', amountInr: -cashbackInr },
      { code: 'REWARDS', label: 'Est. reward value', amountInr: -rewardValueInr },
      ...(offerSavingsInr > 0
        ? [{ code: 'OFFERS', label: 'Offer savings', amountInr: -offerSavingsInr }]
        : []),
      { code: 'EFFECTIVE', label: 'Effective cost', amountInr: effectiveCostInr },
    ],
  };
}

export function buildExplanationFactors(
  raw: SupplierRawOffer,
  pricing: BookingPricingBreakdown,
  context: BookingTravelContext = DEFAULT_CONTEXT,
): BookingExplanationFactor[] {
  const factors: BookingExplanationFactor[] = [
    {
      code: 'EFFECTIVE_COST',
      label: 'Effective cost after rewards',
      detail: `Sticker ₹${pricing.grossPriceInr.toLocaleString('en-IN')} → effective ₹${pricing.effectiveCostInr.toLocaleString('en-IN')}`,
      impactInr: pricing.grossPriceInr - pricing.effectiveCostInr,
    },
  ];

  if (pricing.cashbackInr > 0) {
    factors.push({
      code: 'CASHBACK',
      label: 'Card cashback',
      detail: `Estimated ${Math.round(context.cashbackRate * 100)}% cashback on travel spend`,
      impactInr: pricing.cashbackInr,
    });
  }

  if (pricing.rewardValueInr > 0) {
    factors.push({
      code: 'REWARD_VALUE',
      label: 'Reward earn value',
      detail: context.bestTravelCardName
        ? `Valued using ${context.bestTravelCardName} travel earn rates`
        : 'Estimated reward value from portfolio travel rates',
      impactInr: pricing.rewardValueInr,
    });
  }

  if (pricing.offerSavingsInr > 0) {
    factors.push({
      code: 'OFFER_MATCH',
      label: 'Travel offer savings',
      detail: `${context.travelOfferCount} active travel offer${context.travelOfferCount === 1 ? '' : 's'} in portfolio`,
      impactInr: pricing.offerSavingsInr,
    });
  }

  if (raw.loungeEligibleHint && context.loungeCardCount > 0) {
    factors.push({
      code: 'LOUNGE',
      label: 'Lounge eligibility',
      detail: `Portfolio has ${context.loungeCardCount} lounge-capable card${context.loungeCardCount === 1 ? '' : 's'}`,
      impactInr: null,
    });
  }

  if (raw.baggageIncluded) {
    factors.push({
      code: 'BAGGAGE',
      label: 'Baggage included',
      detail: 'Checked baggage included in fare',
      impactInr: null,
    });
  }

  if (raw.stops === 0) {
    factors.push({
      code: 'NONSTOP',
      label: 'Nonstop itinerary',
      detail: 'Fewer connections — convenience rank boost',
      impactInr: null,
    });
  }

  if (raw.mealPlan && raw.mealPlan !== 'ROOM_ONLY') {
    factors.push({
      code: 'MEAL_PLAN',
      label: raw.mealPlan === 'HALF_BOARD' ? 'Half board included' : 'Breakfast included',
      detail: `${raw.mealPlan.replace('_', ' ')} meal plan on this rate`,
      impactInr: null,
    });
  }

  if (raw.loyaltyProgram) {
    factors.push({
      code: 'LOYALTY',
      label: 'Loyalty earn',
      detail: `${raw.loyaltyProgram}${raw.estimatedLoyaltyPoints ? ` · ~${raw.estimatedLoyaltyPoints.toLocaleString('en-IN')} pts` : ''}`,
      impactInr: null,
    });
  }

  if (raw.cancellationPolicy === 'FREE_24H') {
    factors.push({
      code: 'FLEX_CANCEL',
      label: 'Free cancellation',
      detail: 'Cancel free up to 24 hours before check-in',
      impactInr: null,
    });
  }

  if (raw.starRating != null && raw.starRating >= 4) {
    factors.push({
      code: 'STAR_RATING',
      label: `${raw.starRating}-star property`,
      detail: 'Higher guest quality signal in hotel ranking',
      impactInr: null,
    });
  }

  return factors;
}

export function enrichOffer(
  raw: SupplierRawOffer,
  supplierCode: string,
  rank: number,
  context: BookingTravelContext = DEFAULT_CONTEXT,
): BookingOffer {
  const pricing = buildPricingBreakdown(raw, context);
  const explanations = buildExplanationFactors(raw, pricing, context);
  return {
    id: `${supplierCode}:${raw.supplierOfferId}`,
    product: raw.product,
    supplierCode,
    title: raw.title,
    summary: raw.summary,
    airlineOrProperty: raw.airlineOrProperty,
    departureAt: raw.departureAt,
    arrivalAt: raw.arrivalAt,
    durationMinutes: raw.durationMinutes,
    stops: raw.stops,
    cabinClass: raw.cabinClass,
    baggageIncluded: raw.baggageIncluded,
    loungeEligible: raw.loungeEligibleHint && context.loungeCardCount > 0,
    flightNumber: raw.flightNumber ?? null,
    fareFamily: raw.fareFamily ?? null,
    fareBasis: raw.fareBasis ?? null,
    seatsRemaining: raw.seatsRemaining ?? null,
    availabilityState: raw.availabilityState ?? null,
    tripType: raw.tripType ?? null,
    starRating: raw.starRating ?? null,
    roomType: raw.roomType ?? null,
    mealPlan: raw.mealPlan ?? null,
    cancellationPolicy: raw.cancellationPolicy ?? null,
    loyaltyProgram: raw.loyaltyProgram ?? null,
    chainCode: raw.chainCode ?? null,
    roomsRemaining: raw.roomsRemaining ?? null,
    nightlyRateInr: raw.nightlyRateInr ?? null,
    estimatedLoyaltyPoints: raw.estimatedLoyaltyPoints ?? null,
    rankingScores: null,
    recommendationReason: null,
    pricing,
    explanations,
    recommendedUserCardId: context.bestTravelCardUserCardId,
    recommendedCardName: context.bestTravelCardName,
    rank,
  };
}

export function computeRankingScores(
  offer: BookingOffer,
  cohort: BookingOffer[],
): NonNullable<BookingOffer['rankingScores']> {
  if (offer.product === 'HOTEL') {
    return computeHotelRankingScores(offer, cohort);
  }

  const effectiveCosts = cohort.map((row) => row.pricing.effectiveCostInr);
  const durations = cohort.map((row) => row.durationMinutes ?? 9999);
  const minCost = Math.min(...effectiveCosts);
  const maxCost = Math.max(...effectiveCosts);
  const minDur = Math.min(...durations);
  const maxDur = Math.max(...durations);

  const price =
    maxCost === minCost
      ? 100
      : 100 - ((offer.pricing.effectiveCostInr - minCost) / (maxCost - minCost)) * 100;
  const convenienceBase =
    maxDur === minDur
      ? 100
      : 100 - (((offer.durationMinutes ?? 9999) - minDur) / (maxDur - minDur)) * 100;
  const stopBoost = offer.stops === 0 ? 15 : offer.stops === 1 ? 5 : 0;
  const baggageBoost = offer.baggageIncluded ? 5 : 0;
  const loungeBoost = offer.loungeEligible ? 5 : 0;
  const convenience = Math.min(100, convenienceBase + stopBoost + baggageBoost + loungeBoost);
  const rewardLift = offer.pricing.grossPriceInr - offer.pricing.effectiveCostInr;
  const maxLift = Math.max(
    ...cohort.map((row) => row.pricing.grossPriceInr - row.pricing.effectiveCostInr),
    1,
  );
  const reward = (rewardLift / maxLift) * 100;
  const overall = price * 0.45 + convenience * 0.3 + reward * 0.25;

  return {
    overall: Math.round(overall * 10) / 10,
    price: Math.round(price * 10) / 10,
    convenience: Math.round(convenience * 10) / 10,
    reward: Math.round(reward * 10) / 10,
  };
}

function computeHotelRankingScores(
  offer: BookingOffer,
  cohort: BookingOffer[],
): NonNullable<BookingOffer['rankingScores']> {
  const effectiveCosts = cohort.map((row) => row.pricing.effectiveCostInr);
  const minCost = Math.min(...effectiveCosts);
  const maxCost = Math.max(...effectiveCosts);
  const price =
    maxCost === minCost
      ? 100
      : 100 - ((offer.pricing.effectiveCostInr - minCost) / (maxCost - minCost)) * 100;

  const stars = offer.starRating ?? 3;
  const mealBoost = offer.mealPlan === 'HALF_BOARD' ? 12 : offer.mealPlan === 'BREAKFAST' ? 8 : 0;
  const cancelBoost =
    offer.cancellationPolicy === 'FREE_24H' ? 10 : offer.cancellationPolicy === 'MODERATE' ? 4 : 0;
  const suiteBoost = offer.roomType === 'SUITE' ? 6 : offer.roomType === 'DELUXE' ? 3 : 0;
  const convenience = Math.min(100, stars * 16 + mealBoost + cancelBoost + suiteBoost);

  const rewardLift = offer.pricing.grossPriceInr - offer.pricing.effectiveCostInr;
  const loyaltyBonus = Math.min(40, (offer.estimatedLoyaltyPoints ?? 0) * 0.02);
  const maxLift = Math.max(
    ...cohort.map(
      (row) =>
        row.pricing.grossPriceInr -
        row.pricing.effectiveCostInr +
        Math.min(40, (row.estimatedLoyaltyPoints ?? 0) * 0.02),
    ),
    1,
  );
  const reward = ((rewardLift + loyaltyBonus) / maxLift) * 100;
  const overall = price * 0.4 + convenience * 0.3 + reward * 0.3;

  return {
    overall: Math.round(overall * 10) / 10,
    price: Math.round(price * 10) / 10,
    convenience: Math.round(convenience * 10) / 10,
    reward: Math.round(reward * 10) / 10,
  };
}

export function buildRecommendationReason(offer: BookingOffer): string {
  const parts: string[] = [];
  if (offer.rankingScores) {
    const top =
      offer.rankingScores.price >= offer.rankingScores.convenience &&
      offer.rankingScores.price >= offer.rankingScores.reward
        ? 'best effective price'
        : offer.rankingScores.convenience >= offer.rankingScores.reward
          ? offer.product === 'HOTEL'
            ? 'strong stay quality'
            : 'strong convenience'
          : 'stronger reward / loyalty value';
    parts.push(`Ranked for ${top}`);
  }
  if (offer.product === 'HOTEL') {
    if (offer.starRating) parts.push(`${offer.starRating}★`);
    if (offer.mealPlan === 'BREAKFAST' || offer.mealPlan === 'HALF_BOARD') {
      parts.push(offer.mealPlan === 'HALF_BOARD' ? 'half board' : 'breakfast');
    }
    if (offer.loyaltyProgram) parts.push(offer.loyaltyProgram);
  } else {
    if (offer.stops === 0) parts.push('nonstop');
    if (offer.fareFamily) parts.push(`${offer.fareFamily} fare`);
  }
  if (offer.recommendedCardName) parts.push(`pay with ${offer.recommendedCardName}`);
  return parts.join(' · ') || 'Balanced option for this search';
}

export function filterFlightOffers(
  offers: BookingOffer[],
  filters: { maxStops?: number; preferredAirlines?: string[] },
): BookingOffer[] {
  const preferred = new Set(
    (filters.preferredAirlines ?? []).map((code) => code.trim().toUpperCase()),
  );
  return offers.filter((offer) => {
    if (filters.maxStops != null && (offer.stops ?? 99) > filters.maxStops) return false;
    if (preferred.size > 0) {
      const code = offer.flightNumber?.slice(0, 2)?.toUpperCase() ?? '';
      const nameMatch = [...preferred].some((p) =>
        offer.airlineOrProperty.toUpperCase().includes(p),
      );
      if (!preferred.has(code) && !nameMatch) return false;
    }
    return true;
  });
}

export function filterHotelOffers(
  offers: BookingOffer[],
  filters: { minStarRating?: number; preferredChains?: string[]; mealPlan?: string },
): BookingOffer[] {
  const preferred = new Set(
    (filters.preferredChains ?? []).map((value) => value.trim().toUpperCase()),
  );
  return offers.filter((offer) => {
    if (filters.minStarRating != null && (offer.starRating ?? 0) < filters.minStarRating) {
      return false;
    }
    if (filters.mealPlan && offer.mealPlan !== filters.mealPlan) return false;
    if (preferred.size > 0) {
      const chain = (offer.chainCode ?? '').toUpperCase();
      const name = offer.airlineOrProperty.toUpperCase();
      const match = [...preferred].some(
        (p) =>
          chain === p || name.includes(p) || (offer.loyaltyProgram ?? '').toUpperCase().includes(p),
      );
      if (!match) return false;
    }
    return true;
  });
}

export function rankOffers(offers: BookingOffer[], sortBy: BookingSortBy = 'BEST'): BookingOffer[] {
  const withScores = offers.map((offer) => {
    const rankingScores = computeRankingScores(offer, offers);
    return {
      ...offer,
      rankingScores,
      recommendationReason: buildRecommendationReason({ ...offer, rankingScores }),
    };
  });

  return [...withScores]
    .sort((a, b) => {
      if (sortBy === 'DURATION') {
        return (a.durationMinutes ?? 9999) - (b.durationMinutes ?? 9999);
      }
      if (sortBy === 'DEPARTURE') {
        return (a.departureAt ?? '').localeCompare(b.departureAt ?? '');
      }
      if (sortBy === 'STAR_RATING') {
        const starDiff = (b.starRating ?? 0) - (a.starRating ?? 0);
        if (starDiff !== 0) return starDiff;
        return a.pricing.effectiveCostInr - b.pricing.effectiveCostInr;
      }
      if (sortBy === 'LOYALTY') {
        const loyaltyDiff = (b.estimatedLoyaltyPoints ?? 0) - (a.estimatedLoyaltyPoints ?? 0);
        if (loyaltyDiff !== 0) return loyaltyDiff;
        return (b.rankingScores?.reward ?? 0) - (a.rankingScores?.reward ?? 0);
      }
      if (sortBy === 'EFFECTIVE_COST') {
        if (a.pricing.effectiveCostInr !== b.pricing.effectiveCostInr) {
          return a.pricing.effectiveCostInr - b.pricing.effectiveCostInr;
        }
        return (b.starRating ?? 0) - (a.starRating ?? 0);
      }
      const scoreDiff = (b.rankingScores?.overall ?? 0) - (a.rankingScores?.overall ?? 0);
      if (Math.abs(scoreDiff) > 0.05) return scoreDiff;
      return a.pricing.effectiveCostInr - b.pricing.effectiveCostInr;
    })
    .map((offer, index) => ({
      ...offer,
      recommendationReason: buildRecommendationReason(offer),
      rank: index + 1,
    }));
}

export function buildSearchResult(input: {
  searchId: string;
  product: BookingProduct;
  query: Record<string, unknown>;
  batches: Array<{ supplierCode: string; rawOffers: SupplierRawOffer[] }>;
  context: BookingTravelContext;
  maxStops?: number;
  preferredAirlines?: string[];
  minStarRating?: number;
  preferredChains?: string[];
  mealPlan?: string;
  sortBy?: BookingSortBy;
  generatedAt?: Date;
}): BookingSearchResult {
  const enriched = input.batches.flatMap((batch) =>
    batch.rawOffers.map((raw, index) =>
      enrichOffer(raw, batch.supplierCode, index + 1, input.context),
    ),
  );
  const filtered =
    input.product === 'HOTEL'
      ? filterHotelOffers(enriched, {
          minStarRating: input.minStarRating,
          preferredChains: input.preferredChains,
          mealPlan: input.mealPlan,
        })
      : filterFlightOffers(enriched, {
          maxStops: input.maxStops,
          preferredAirlines: input.preferredAirlines,
        });
  const offers = rankOffers(filtered, input.sortBy ?? 'BEST');
  return {
    searchId: input.searchId,
    product: input.product,
    query: input.query,
    offerCount: offers.length,
    offers,
    suppliersQueried: input.batches.map((batch) => batch.supplierCode),
    generatedAt: (input.generatedAt ?? new Date()).toISOString(),
  };
}

export function buildPricingResult(input: {
  offerId: string;
  product: BookingProduct;
  grossPriceInr: number;
  context: BookingTravelContext;
}): BookingPricingResult {
  const baseFareInr = roundInr(input.grossPriceInr / 1.15);
  const taxesInr = roundInr(baseFareInr * 0.12);
  const feesInr = roundInr(input.grossPriceInr - baseFareInr - taxesInr);
  const raw: SupplierRawOffer = {
    supplierOfferId: input.offerId,
    product: input.product,
    title: 'Priced offer',
    summary: '',
    airlineOrProperty: '',
    departureAt: null,
    arrivalAt: null,
    durationMinutes: null,
    stops: null,
    cabinClass: null,
    baggageIncluded: false,
    loungeEligibleHint: input.context.loungeCardCount > 0,
    baseFareInr,
    taxesInr,
    feesInr: Math.max(0, feesInr),
    ancillariesInr: 0,
  };
  const pricing = buildPricingBreakdown(raw, input.context);
  return {
    offerId: input.offerId,
    pricing,
    explanations: buildExplanationFactors(raw, pricing, input.context),
    recommendedUserCardId: input.context.bestTravelCardUserCardId,
    recommendedCardName: input.context.bestTravelCardName,
  };
}

export function flightSearchToQuery(input: BookingFlightSearchInput): Record<string, unknown> {
  return {
    origin: input.origin,
    destination: input.destination,
    departureDate: input.departureDate,
    returnDate: input.returnDate ?? null,
    tripType: input.tripType,
    passengers: input.passengers,
    cabinClass: input.cabinClass,
    maxStops: input.maxStops ?? null,
    preferredAirlines: input.preferredAirlines ?? [],
    sortBy: input.sortBy,
    userCardId: input.userCardId ?? null,
  };
}

export function hotelSearchToQuery(input: BookingHotelSearchInput): Record<string, unknown> {
  return {
    destination: input.destination,
    checkInDate: input.checkInDate,
    checkOutDate: input.checkOutDate,
    guests: input.guests,
    rooms: input.rooms,
    minStarRating: input.minStarRating ?? null,
    preferredChains: input.preferredChains ?? [],
    mealPlan: input.mealPlan ?? null,
    sortBy: input.sortBy,
    userCardId: input.userCardId ?? null,
  };
}

export function searchInputToQuery(input: BookingSearchInput): Record<string, unknown> {
  return { ...input };
}

export function resolveTravelContext(overview: {
  loungeCardCount: number;
  travelOfferCount: number;
  bestTravelCardUserCardId: string | null;
  cards: Array<{
    userCardId: string;
    cardName: string;
    travelRewardRules: Array<{
      rewardMultiplier: number | null;
      cashbackPercent: number | null;
    }>;
  }>;
}): BookingTravelContext {
  const best =
    overview.cards.find((card) => card.userCardId === overview.bestTravelCardUserCardId) ??
    overview.cards[0] ??
    null;

  const cashbackPercents = overview.cards.flatMap((card) =>
    card.travelRewardRules
      .map((rule) => rule.cashbackPercent)
      .filter((value): value is number => value != null && value > 0),
  );
  const multipliers = overview.cards.flatMap((card) =>
    card.travelRewardRules
      .map((rule) => rule.rewardMultiplier)
      .filter((value): value is number => value != null && value > 0),
  );

  const maxCashback = cashbackPercents.length > 0 ? Math.max(...cashbackPercents) : 3;
  const maxMultiplier = multipliers.length > 0 ? Math.max(...multipliers) : 2;

  return {
    bestTravelCardUserCardId: overview.bestTravelCardUserCardId,
    bestTravelCardName: best?.cardName ?? null,
    loungeCardCount: overview.loungeCardCount,
    travelOfferCount: overview.travelOfferCount,
    cashbackRate: Math.min(0.12, maxCashback / 100),
    rewardValueRate: Math.min(0.15, maxMultiplier * 0.015),
    offerSavingsCapInr: overview.travelOfferCount > 0 ? 2500 : 0,
  };
}

export function roundInr(value: number): number {
  return Math.round(value);
}
