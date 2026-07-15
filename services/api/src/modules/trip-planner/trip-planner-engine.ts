import type {
  TripBudgetBreakdown,
  TripCardPick,
  TripCategoryRecommendation,
  TripLoungeEligibility,
  TripPlanInput,
  TripPlanResult,
  TripRewardOpportunity,
  TripScope,
  TripSpendCategory,
  TripTravelBenefitHighlight,
} from '@cardwise/validation';
import { TRIP_SPEND_CATEGORY_LABELS } from '@cardwise/validation';

const INTERNATIONAL_KEYWORDS = [
  'dubai',
  'singapore',
  'london',
  'paris',
  'bangkok',
  'bali',
  'tokyo',
  'new york',
  'sydney',
  'maldives',
  'europe',
  'usa',
  'uk',
  'uae',
  'thailand',
  'vietnam',
  'sri lanka',
  'nepal',
  'bhutan',
  'international',
  'abroad',
];

const CATEGORY_SLUGS: Record<TripSpendCategory, string> = {
  FLIGHTS: 'travel',
  HOTELS: 'travel',
  DINING: 'dining',
  TRANSPORT: 'travel',
};

export type TripCardEvaluation = {
  userCardId: string;
  creditCardId: string;
  cardName: string;
  bankName: string;
  category: TripSpendCategory;
  spendAmountInr: number;
  expectedRewardInr: number;
  estimatedPoints: number;
  effectiveRatePercent: number;
  ruleName: string | null;
  excluded: boolean;
  preferenceBoost: number;
};

export type TripCardSnapshot = {
  userCardId: string;
  creditCardId: string;
  cardName: string;
  bankName: string;
  loungeSummary: string | null;
  loungeBenefits: Array<{
    title: string;
    description: string | null;
    allowanceLabel: string | null;
  }>;
  travelBenefits: Array<{ title: string; description: string | null }>;
  milesBalances: Array<{
    kind: 'MILES' | 'HOTEL_POINTS';
    availableAmount: number;
    estimatedValueInr: number | null;
  }>;
  travelOffers: Array<{ title: string; description: string | null }>;
};

export function roundInr(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeTripDays(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  const diffMs = end.getTime() - start.getTime();
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
  return Math.max(days, 1);
}

export function inferTripScope(destination: string): TripScope {
  const normalized = destination.trim().toLowerCase();
  if (INTERNATIONAL_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return 'INTERNATIONAL';
  }
  return 'DOMESTIC';
}

export function splitTripBudget(budgetInr: number, tripDays: number): TripBudgetBreakdown {
  const hotelWeight = tripDays >= 5 ? 0.42 : 0.38;
  const flightWeight = tripDays >= 5 ? 0.4 : 0.45;
  const diningWeight = 0.12;
  const transportWeight = 1 - flightWeight - hotelWeight - diningWeight;

  return {
    flightsInr: roundInr(budgetInr * flightWeight),
    hotelsInr: roundInr(budgetInr * hotelWeight),
    diningInr: roundInr(budgetInr * diningWeight),
    transportInr: roundInr(budgetInr * transportWeight),
  };
}

export function categorySlugForTripSpend(category: TripSpendCategory): string {
  return CATEGORY_SLUGS[category] ?? 'travel';
}

export function isLoungeEligibleForScope(
  loungeBenefits: TripCardSnapshot['loungeBenefits'],
  scope: TripScope,
): boolean {
  if (loungeBenefits.length === 0) return false;

  return loungeBenefits.some((benefit) => {
    const text = `${benefit.title} ${benefit.description ?? ''}`.toLowerCase();
    if (text.includes('unlimited')) return true;
    if (scope === 'INTERNATIONAL') {
      return (
        text.includes('international') || text.includes('priority pass') || text.includes('global')
      );
    }
    return text.includes('domestic') || text.includes('lounge') || text.includes('airport');
  });
}

export function loungeScopeNote(scope: TripScope, eligible: boolean): string {
  if (!eligible) return 'No lounge benefit detected for this trip type';
  return scope === 'INTERNATIONAL'
    ? 'International or global lounge access likely applies'
    : 'Domestic lounge access likely applies';
}

function preferenceBoostForCategory(
  card: TripCardSnapshot,
  category: TripSpendCategory,
  input: TripPlanInput,
): number {
  const needle =
    category === 'FLIGHTS'
      ? input.preferredAirline?.toLowerCase()
      : category === 'HOTELS'
        ? input.preferredHotel?.toLowerCase()
        : null;

  if (!needle) return 0;

  const haystacks = [
    ...card.travelBenefits.map((row) => `${row.title} ${row.description ?? ''}`),
    ...card.travelOffers.map((row) => `${row.title} ${row.description ?? ''}`),
  ]
    .join(' ')
    .toLowerCase();

  return haystacks.includes(needle) ? 250 : 0;
}

export function rankEvaluationsForCategory(evaluations: TripCardEvaluation[]): TripCardPick[] {
  return [...evaluations]
    .filter((row) => !row.excluded && row.expectedRewardInr > 0)
    .sort((a, b) => {
      const scoreA = a.expectedRewardInr + a.preferenceBoost;
      const scoreB = b.expectedRewardInr + b.preferenceBoost;
      return scoreB - scoreA;
    })
    .map((row) => ({
      userCardId: row.userCardId,
      cardName: row.cardName,
      bankName: row.bankName,
      expectedRewardInr: row.expectedRewardInr,
      estimatedPoints: row.estimatedPoints,
      effectiveRatePercent: row.effectiveRatePercent,
      rationale: buildPickRationale(row),
    }));
}

function buildPickRationale(row: TripCardEvaluation): string {
  const parts = [
    row.ruleName
      ? `Best ${TRIP_SPEND_CATEGORY_LABELS[row.category].toLowerCase()} earn via ${row.ruleName}`
      : `Strong ${TRIP_SPEND_CATEGORY_LABELS[row.category].toLowerCase()} rewards`,
    `${row.effectiveRatePercent.toFixed(2)}% effective on ₹${row.spendAmountInr.toLocaleString('en-IN')}`,
  ];
  if (row.preferenceBoost > 0) {
    parts.push('Matches your preferred program');
  }
  return parts.join(' · ');
}

export function buildCategoryRecommendations(
  evaluations: TripCardEvaluation[],
  breakdown: TripBudgetBreakdown,
): TripCategoryRecommendation[] {
  const categories: Array<{ category: TripSpendCategory; spendAmountInr: number }> = [
    { category: 'FLIGHTS', spendAmountInr: breakdown.flightsInr },
    { category: 'HOTELS', spendAmountInr: breakdown.hotelsInr },
    { category: 'DINING', spendAmountInr: breakdown.diningInr },
    { category: 'TRANSPORT', spendAmountInr: breakdown.transportInr },
  ];

  return categories.map(({ category, spendAmountInr }) => {
    const ranked = rankEvaluationsForCategory(
      evaluations.filter((row) => row.category === category),
    );
    return {
      category,
      categoryLabel: TRIP_SPEND_CATEGORY_LABELS[category],
      spendAmountInr,
      recommendedCard: ranked[0] ?? null,
      alternatives: ranked.slice(1, 3),
    };
  });
}

export function buildLoungeEligibility(
  cards: TripCardSnapshot[],
  scope: TripScope,
): TripLoungeEligibility[] {
  return cards
    .filter((card) => card.loungeBenefits.length > 0)
    .map((card) => {
      const eligible = isLoungeEligibleForScope(card.loungeBenefits, scope);
      return {
        userCardId: card.userCardId,
        cardName: card.cardName,
        bankName: card.bankName,
        eligible,
        loungeSummary: card.loungeSummary,
        scopeNote: loungeScopeNote(scope, eligible),
      };
    })
    .sort((a, b) => Number(b.eligible) - Number(a.eligible));
}

export function buildTravelBenefitHighlights(
  cards: TripCardSnapshot[],
): TripTravelBenefitHighlight[] {
  const rows: TripTravelBenefitHighlight[] = [];
  for (const card of cards) {
    for (const benefit of card.travelBenefits.slice(0, 2)) {
      rows.push({
        userCardId: card.userCardId,
        cardName: card.cardName,
        bankName: card.bankName,
        title: benefit.title,
        description: benefit.description,
      });
    }
  }
  return rows.slice(0, 8);
}

export function buildRewardOpportunities(input: {
  cards: TripCardSnapshot[];
  recommendations: TripCategoryRecommendation[];
  scope: TripScope;
}): TripRewardOpportunity[] {
  const opportunities: TripRewardOpportunity[] = [];
  let rank = 1;

  for (const category of input.recommendations) {
    const pick = category.recommendedCard;
    if (!pick) continue;
    opportunities.push({
      kind: 'EARN',
      title: `Earn on ${category.categoryLabel.toLowerCase()}`,
      description: `Use ${pick.cardName} for ${category.categoryLabel.toLowerCase()} (~${pick.estimatedPoints.toLocaleString('en-IN')} points, ${pick.effectiveRatePercent.toFixed(2)}% effective).`,
      userCardId: pick.userCardId,
      cardName: pick.cardName,
      estimatedValueInr: pick.expectedRewardInr,
      priorityRank: rank++,
    });
  }

  for (const card of input.cards) {
    for (const balance of card.milesBalances) {
      if (balance.availableAmount <= 0) continue;
      const label = balance.kind === 'MILES' ? 'miles' : 'hotel points';
      opportunities.push({
        kind: 'REDEEM',
        title: `Redeem ${label} on ${card.cardName}`,
        description: `${balance.availableAmount.toLocaleString('en-IN')} ${label} available${balance.estimatedValueInr != null ? ` (~₹${balance.estimatedValueInr.toLocaleString('en-IN')})` : ''}.`,
        userCardId: card.userCardId,
        cardName: card.cardName,
        estimatedValueInr: balance.estimatedValueInr,
        priorityRank: rank++,
      });
    }
  }

  for (const card of input.cards) {
    for (const offer of card.travelOffers.slice(0, 1)) {
      opportunities.push({
        kind: 'OFFER',
        title: offer.title,
        description: offer.description ?? `Active travel offer on ${card.cardName}.`,
        userCardId: card.userCardId,
        cardName: card.cardName,
        estimatedValueInr: null,
        priorityRank: rank++,
      });
    }
  }

  return opportunities.slice(0, 10);
}

export function buildTripSummary(input: {
  destination: string;
  tripDays: number;
  scope: TripScope;
  budgetInr: number;
  totalEstimatedValueInr: number;
  loungeEligibleCount: number;
  topCardName: string | null;
}): string {
  const scopeLabel = input.scope === 'INTERNATIONAL' ? 'international' : 'domestic';
  const rewardLine =
    input.totalEstimatedValueInr > 0
      ? `Estimated rewards worth ~₹${input.totalEstimatedValueInr.toLocaleString('en-IN')} across your trip spend.`
      : 'Add travel-earn cards to improve estimated rewards.';
  const loungeLine =
    input.loungeEligibleCount > 0
      ? `${input.loungeEligibleCount} card${input.loungeEligibleCount === 1 ? '' : 's'} likely include lounge access for this ${scopeLabel} trip.`
      : 'No lounge-eligible cards detected for this trip type.';
  const cardLine = input.topCardName
    ? `Top overall pick: ${input.topCardName}.`
    : 'No single card dominates every category — use category-specific picks below.';

  return `${input.tripDays}-day ${scopeLabel} trip to ${input.destination} on a ₹${input.budgetInr.toLocaleString('en-IN')} budget. ${rewardLine} ${loungeLine} ${cardLine}`;
}

export function buildTripPlanResult(input: {
  plan: TripPlanInput;
  cards: TripCardSnapshot[];
  evaluations: TripCardEvaluation[];
}): TripPlanResult {
  const tripDays = computeTripDays(input.plan.startDate, input.plan.endDate);
  const scope = inferTripScope(input.plan.destination);
  const budgetBreakdown = splitTripBudget(input.plan.budgetInr, tripDays);
  const recommendedCards = buildCategoryRecommendations(input.evaluations, budgetBreakdown);
  const loungeEligibility = buildLoungeEligibility(input.cards, scope);
  const travelBenefits = buildTravelBenefitHighlights(input.cards);
  const rewardOpportunities = buildRewardOpportunities({
    cards: input.cards,
    recommendations: recommendedCards,
    scope,
  });

  const totalEstimatedPoints = recommendedCards.reduce(
    (sum, row) => sum + (row.recommendedCard?.estimatedPoints ?? 0),
    0,
  );
  const totalEstimatedValueInr = roundInr(
    recommendedCards.reduce((sum, row) => sum + (row.recommendedCard?.expectedRewardInr ?? 0), 0),
  );

  const topCardName =
    recommendedCards
      .map((row) => row.recommendedCard)
      .filter(Boolean)
      .sort((a, b) => (b?.expectedRewardInr ?? 0) - (a?.expectedRewardInr ?? 0))[0]?.cardName ??
    null;

  return {
    destination: input.plan.destination,
    tripDays,
    scope,
    budgetInr: input.plan.budgetInr,
    budgetBreakdown,
    recommendedCards,
    totalEstimatedPoints,
    totalEstimatedValueInr,
    loungeEligibility,
    travelBenefits,
    rewardOpportunities,
    summary: buildTripSummary({
      destination: input.plan.destination,
      tripDays,
      scope,
      budgetInr: input.plan.budgetInr,
      totalEstimatedValueInr,
      loungeEligibleCount: loungeEligibility.filter((row) => row.eligible).length,
      topCardName,
    }),
    preferredProgramMatches: {
      airline: input.plan.preferredAirline ?? null,
      hotel: input.plan.preferredHotel ?? null,
    },
  };
}

export function applyPreferenceBoost(
  evaluations: TripCardEvaluation[],
  cards: TripCardSnapshot[],
  input: TripPlanInput,
): TripCardEvaluation[] {
  const cardById = new Map(cards.map((card) => [card.userCardId, card]));
  return evaluations.map((row) => {
    const card = cardById.get(row.userCardId);
    return {
      ...row,
      preferenceBoost: card ? preferenceBoostForCategory(card, row.category, input) : 0,
    };
  });
}
