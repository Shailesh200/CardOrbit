import { authFetch } from '@cardwise/auth';

const API_BASE = import.meta.env.VITE_API_URL || '';

export type BookingProduct = 'FLIGHT' | 'HOTEL';
export type BookingCabinClass = 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';

export type BookingPricingBreakdown = {
  currency: 'INR';
  baseFareInr: number;
  taxesInr: number;
  feesInr: number;
  ancillariesInr: number;
  grossPriceInr: number;
  cashbackInr: number;
  rewardValueInr: number;
  offerSavingsInr: number;
  effectiveCostInr: number;
  lines: Array<{ code: string; label: string; amountInr: number }>;
};

export type BookingExplanationFactor = {
  code: string;
  label: string;
  detail: string;
  impactInr: number | null;
};

export type BookingOffer = {
  id: string;
  product: BookingProduct;
  supplierCode: string;
  title: string;
  summary: string;
  airlineOrProperty: string;
  departureAt: string | null;
  arrivalAt: string | null;
  durationMinutes: number | null;
  stops: number | null;
  cabinClass: BookingCabinClass | null;
  baggageIncluded: boolean;
  loungeEligible: boolean;
  flightNumber?: string | null;
  fareFamily?: 'BASIC' | 'FLEX' | 'PLUS' | null;
  fareBasis?: string | null;
  seatsRemaining?: number | null;
  availabilityState?: 'AVAILABLE' | 'LIMITED' | 'WAITLIST' | 'UNAVAILABLE' | null;
  tripType?: 'ONE_WAY' | 'ROUND_TRIP' | null;
  starRating?: number | null;
  roomType?: 'STANDARD' | 'DELUXE' | 'SUITE' | null;
  mealPlan?: 'ROOM_ONLY' | 'BREAKFAST' | 'HALF_BOARD' | null;
  cancellationPolicy?: 'FREE_24H' | 'MODERATE' | 'NON_REFUNDABLE' | null;
  loyaltyProgram?: string | null;
  chainCode?: string | null;
  roomsRemaining?: number | null;
  nightlyRateInr?: number | null;
  estimatedLoyaltyPoints?: number | null;
  rankingScores?: {
    overall: number;
    price: number;
    convenience: number;
    reward: number;
  } | null;
  recommendationReason?: string | null;
  pricing: BookingPricingBreakdown;
  explanations: BookingExplanationFactor[];
  recommendedUserCardId: string | null;
  recommendedCardName: string | null;
  rank: number;
};

export type BookingSearchResult = {
  searchId: string;
  product: BookingProduct;
  query: Record<string, unknown>;
  offerCount: number;
  offers: BookingOffer[];
  suppliersQueried: string[];
  generatedAt: string;
};

export type BookingHub = {
  enabled: boolean;
  supportedProducts: BookingProduct[];
  lifecycleStages: string[];
  suppliers: Array<{
    code: string;
    name: string;
    products: BookingProduct[];
    status: 'MOCK' | 'LIVE' | 'DISABLED';
  }>;
  notes: string[];
};

export type FlightSearchInput = {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string | null;
  tripType?: 'ONE_WAY' | 'ROUND_TRIP';
  passengers?: { adults: number; children: number; infants: number };
  cabinClass?: BookingCabinClass;
  maxStops?: number;
  sortBy?: 'EFFECTIVE_COST' | 'DURATION' | 'DEPARTURE' | 'BEST';
};

export type HotelSearchInput = {
  destination: string;
  checkInDate: string;
  checkOutDate: string;
  guests?: number;
  rooms?: number;
  minStarRating?: number;
  preferredChains?: string[];
  mealPlan?: 'ROOM_ONLY' | 'BREAKFAST' | 'HALF_BOARD';
  sortBy?: 'EFFECTIVE_COST' | 'STAR_RATING' | 'LOYALTY' | 'BEST';
};

export type BookingFareValidateResult = {
  offerId: string;
  outcome: 'VALID' | 'PRICE_INCREASED' | 'PRICE_DECREASED' | 'LIMITED' | 'UNAVAILABLE';
  previousGrossInr: number;
  currentGrossInr: number;
  priceDeltaInr: number;
  pricing: BookingPricingBreakdown;
  explanations: BookingExplanationFactor[];
  detail: string;
};

export type BookingLoyaltyOption = {
  path: 'CARD_CASH_REWARDS' | 'CHAIN_LOYALTY_EARN' | 'PORTAL_ACCELERATION' | 'CHAIN_POINTS_REDEEM';
  label: string;
  rank: number;
  estimatedRewardValueInr: number;
  estimatedEffectiveCostInr: number;
  selected: boolean;
  detail: string;
  explanations: BookingExplanationFactor[];
};

export type BookingLoyaltyOptimizeResult = {
  offerId: string | null;
  grossPriceInr: number;
  pathCount: number;
  paths: BookingLoyaltyOption[];
  recommendedPath: BookingLoyaltyOption['path'] | null;
  recommendedLabel: string | null;
};

export type BookingPaymentCardOption = {
  userCardId: string;
  cardName: string;
  bankName: string;
  rank: number;
  cashbackInr: number;
  rewardValueInr: number;
  effectiveCostInr: number;
  selected: boolean;
  explanations: BookingExplanationFactor[];
};

export type BookingPaymentOptimizeResult = {
  offerId: string | null;
  product: BookingProduct;
  grossPriceInr: number;
  cardCount: number;
  cards: BookingPaymentCardOption[];
  recommendedUserCardId: string | null;
  recommendedCardName: string | null;
};

export function getBookingHub() {
  return authFetch<BookingHub>(`${API_BASE}/api/v1/bookings`);
}

export function searchFlights(input: FlightSearchInput) {
  return authFetch<BookingSearchResult>(`${API_BASE}/api/v1/bookings/flights/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function searchHotels(input: HotelSearchInput) {
  return authFetch<BookingSearchResult>(`${API_BASE}/api/v1/bookings/hotels/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function validateFlightFare(input: {
  offerId: string;
  searchId?: string;
  grossPriceInr?: number;
}) {
  return authFetch<BookingFareValidateResult>(`${API_BASE}/api/v1/bookings/flights/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function validateHotelRate(input: {
  offerId: string;
  searchId?: string;
  grossPriceInr?: number;
}) {
  return authFetch<BookingFareValidateResult>(`${API_BASE}/api/v1/bookings/hotels/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function optimizeHotelLoyalty(input: {
  offerId?: string;
  searchId?: string;
  grossPriceInr: number;
  loyaltyProgram?: string;
  estimatedLoyaltyPoints?: number;
  chainCode?: string;
}) {
  return authFetch<BookingLoyaltyOptimizeResult>(
    `${API_BASE}/api/v1/bookings/hotels/loyalty/optimize`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  );
}

export function optimizeBookingPayment(input: {
  offerId?: string;
  product?: BookingProduct;
  grossPriceInr: number;
}) {
  return authFetch<BookingPaymentOptimizeResult>(`${API_BASE}/api/v1/bookings/payment/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export type BookingChannelRecommendation = {
  channelId: string;
  slug: string;
  name: string;
  bankName: string;
  kind: 'DIRECT' | 'PORTAL_HANDOFF';
  product: BookingProduct;
  rank: number;
  requiresExternalBooking: boolean;
  deepLinkUrl: string;
  searchHint: string | null;
  accelerationSummary: string;
  estimatedGrossInr: number;
  estimatedRewardValueInr: number;
  estimatedEffectiveCostInr: number;
  estimatedAccelerationLiftInr: number;
  recommendedUserCardId: string | null;
  recommendedCardName: string | null;
  portfolioMatch: boolean;
  explanations: BookingExplanationFactor[];
  eligibilityNotes: string | null;
};

export type BookingChannelRecommendResult = {
  product: BookingProduct;
  estimatedGrossInr: number;
  channelCount: number;
  channels: BookingChannelRecommendation[];
  directChannel: BookingChannelRecommendation | null;
  disclosure: string;
  generatedAt: string;
};

export type ChannelRecommendInput = {
  product?: BookingProduct;
  origin?: string;
  destination?: string;
  departureDate?: string;
  returnDate?: string | null;
  checkInDate?: string;
  checkOutDate?: string;
  estimatedGrossInr?: number;
  directEffectiveCostInr?: number;
};

export function recommendBookingChannels(input: ChannelRecommendInput) {
  return authFetch<BookingChannelRecommendResult>(
    `${API_BASE}/api/v1/bookings/channels/recommend`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  );
}

export function recordPortalHandoff(input: {
  channelId: string;
  slug?: string;
  product?: BookingProduct;
  deepLinkUrl?: string;
}) {
  return authFetch<{ ok: boolean; channelId: string; deepLinkUrl: string }>(
    `${API_BASE}/api/v1/bookings/channels/handoff`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  );
}

export function formatBookingInr(value: number): string {
  const sign = value < 0 ? '-' : '';
  return `${sign}₹${Math.abs(Math.round(value)).toLocaleString('en-IN')}`;
}

export function defaultFlightDates() {
  const departure = new Date();
  departure.setDate(departure.getDate() + 21);
  const ret = new Date(departure);
  ret.setDate(ret.getDate() + 7);
  return {
    departureDate: departure.toISOString().slice(0, 10),
    returnDate: ret.toISOString().slice(0, 10),
  };
}

export function defaultHotelDates() {
  const checkIn = new Date();
  checkIn.setDate(checkIn.getDate() + 21);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 3);
  return {
    checkInDate: checkIn.toISOString().slice(0, 10),
    checkOutDate: checkOut.toISOString().slice(0, 10),
  };
}
