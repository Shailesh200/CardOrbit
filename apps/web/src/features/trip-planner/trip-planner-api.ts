import { authFetch } from '@cardwise/auth';

const API_BASE = import.meta.env.VITE_API_URL || '';

export type TripPlanInput = {
  destination: string;
  startDate: string;
  endDate: string;
  budgetInr: number;
  preferredAirline?: string;
  preferredHotel?: string;
};

export type TripCardPick = {
  userCardId: string;
  cardName: string;
  bankName: string;
  expectedRewardInr: number;
  estimatedPoints: number;
  effectiveRatePercent: number;
  rationale: string;
};

export type TripPlanResult = {
  destination: string;
  tripDays: number;
  scope: 'DOMESTIC' | 'INTERNATIONAL';
  budgetInr: number;
  budgetBreakdown: {
    flightsInr: number;
    hotelsInr: number;
    diningInr: number;
    transportInr: number;
  };
  recommendedCards: Array<{
    category: 'FLIGHTS' | 'HOTELS' | 'DINING' | 'TRANSPORT';
    categoryLabel: string;
    spendAmountInr: number;
    recommendedCard: TripCardPick | null;
    alternatives: TripCardPick[];
  }>;
  totalEstimatedPoints: number;
  totalEstimatedValueInr: number;
  loungeEligibility: Array<{
    userCardId: string;
    cardName: string;
    bankName: string;
    eligible: boolean;
    loungeSummary: string | null;
    scopeNote: string;
  }>;
  travelBenefits: Array<{
    userCardId: string;
    cardName: string;
    bankName: string;
    title: string;
    description: string | null;
  }>;
  rewardOpportunities: Array<{
    kind: 'EARN' | 'REDEEM' | 'OFFER';
    title: string;
    description: string;
    userCardId: string | null;
    cardName: string | null;
    estimatedValueInr: number | null;
    priorityRank: number;
  }>;
  summary: string;
  preferredProgramMatches: {
    airline: string | null;
    hotel: string | null;
  };
};

export function formatInr(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function trackTripPlannerViewed() {
  return authFetch<{ ok: boolean }>(`${API_BASE}/api/v1/trip-planner`);
}

export function createTripPlan(input: TripPlanInput) {
  return authFetch<TripPlanResult>(`${API_BASE}/api/v1/trip-planner/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}
