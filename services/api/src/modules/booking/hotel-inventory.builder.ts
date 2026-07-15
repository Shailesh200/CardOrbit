import type {
  BookingAvailabilityState,
  BookingFareValidateOutcome,
  BookingHotelAvailabilityResult,
  BookingPricingBreakdown,
  BookingRateValidateResult,
} from '@cardwise/validation';

import {
  buildExplanationFactors,
  buildPricingBreakdown,
  type BookingTravelContext,
} from './booking.builder';
import { hashSeed, type SupplierRawOffer } from './booking.supplier';

export function resolveHotelAvailability(
  offerId: string,
  roomsHint?: number | null,
): {
  state: BookingAvailabilityState;
  roomsRemaining: number | null;
  detail: string;
} {
  const seed = hashSeed(`hotel-avail|${offerId}`);
  const bucket = seed % 18;
  if (bucket === 0) {
    return {
      state: 'UNAVAILABLE',
      roomsRemaining: 0,
      detail: 'Property sold out for these dates — pick another offer',
    };
  }
  if (bucket <= 3 || (roomsHint != null && roomsHint <= 2)) {
    const rooms = roomsHint != null && roomsHint > 0 ? Math.min(roomsHint, 2) : 1 + (seed % 2);
    return {
      state: 'LIMITED',
      roomsRemaining: rooms,
      detail: `Only ${rooms} room${rooms === 1 ? '' : 's'} left at this rate`,
    };
  }
  const rooms = roomsHint ?? 3 + (seed % 8);
  return {
    state: 'AVAILABLE',
    roomsRemaining: rooms,
    detail: 'Rooms available at last quoted rate',
  };
}

export function buildHotelAvailabilityResult(
  offerId: string,
  roomsHint?: number | null,
): BookingHotelAvailabilityResult {
  const resolved = resolveHotelAvailability(offerId, roomsHint);
  return {
    offerId,
    state: resolved.state,
    roomsRemaining: resolved.roomsRemaining,
    detail: resolved.detail,
  };
}

export function buildRateValidateResult(input: {
  offerId: string;
  previousGrossInr: number;
  raw: Pick<
    SupplierRawOffer,
    | 'baseFareInr'
    | 'taxesInr'
    | 'feesInr'
    | 'ancillariesInr'
    | 'baggageIncluded'
    | 'loungeEligibleHint'
    | 'stops'
    | 'product'
    | 'mealPlan'
    | 'loyaltyProgram'
  > &
    Partial<SupplierRawOffer>;
  context: BookingTravelContext;
}): BookingRateValidateResult {
  const seed = hashSeed(`rate|${input.offerId}`);
  const bucket = seed % 12;
  let outcome: BookingFareValidateOutcome = 'VALID';
  let currentGrossInr = input.previousGrossInr;
  let detail = 'Rate still valid at the quoted price';

  if (bucket === 0) {
    outcome = 'UNAVAILABLE';
    detail = 'Rate no longer available — search again';
  } else if (bucket <= 2) {
    outcome = 'PRICE_INCREASED';
    const bump = Math.round(input.previousGrossInr * (0.04 + (seed % 5) / 100));
    currentGrossInr = input.previousGrossInr + bump;
    detail = `Nightly rate increased by ₹${bump.toLocaleString('en-IN')} since search`;
  } else if (bucket === 3) {
    outcome = 'PRICE_DECREASED';
    const drop = Math.round(input.previousGrossInr * (0.02 + (seed % 4) / 100));
    currentGrossInr = Math.max(1500, input.previousGrossInr - drop);
    detail = `Rate dropped by ₹${drop.toLocaleString('en-IN')} — good time to lock`;
  } else if (bucket === 4) {
    outcome = 'LIMITED';
    detail = 'Rate valid but room inventory is limited';
  }

  const scale = currentGrossInr / Math.max(1, input.previousGrossInr);
  const scaledRaw = {
    baseFareInr: Math.round(input.raw.baseFareInr * scale),
    taxesInr: Math.round(input.raw.taxesInr * scale),
    feesInr: Math.round(input.raw.feesInr * scale),
    ancillariesInr: Math.round(input.raw.ancillariesInr * scale),
  };
  const pricing: BookingPricingBreakdown = buildPricingBreakdown(scaledRaw, input.context);
  const explanations = buildExplanationFactors(
    {
      supplierOfferId: input.offerId,
      title: '',
      summary: '',
      airlineOrProperty: '',
      departureAt: null,
      arrivalAt: null,
      durationMinutes: null,
      cabinClass: null,
      product: 'HOTEL',
      stops: null,
      baggageIncluded: false,
      loungeEligibleHint: input.raw.loungeEligibleHint ?? false,
      baseFareInr: scaledRaw.baseFareInr,
      taxesInr: scaledRaw.taxesInr,
      feesInr: scaledRaw.feesInr,
      ancillariesInr: scaledRaw.ancillariesInr,
      mealPlan: input.raw.mealPlan ?? null,
      loyaltyProgram: input.raw.loyaltyProgram ?? null,
    },
    pricing,
    input.context,
  );

  return {
    offerId: input.offerId,
    outcome,
    previousGrossInr: input.previousGrossInr,
    currentGrossInr,
    priceDeltaInr: currentGrossInr - input.previousGrossInr,
    pricing,
    explanations,
    detail,
  };
}
