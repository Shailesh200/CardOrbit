import type {
  BookingFareValidateOutcome,
  BookingFareValidateResult,
  BookingFlightAvailabilityResult,
  BookingPricingBreakdown,
} from '@cardwise/validation';

import {
  buildExplanationFactors,
  buildPricingBreakdown,
  type BookingTravelContext,
} from './booking.builder';
import { hashSeed, type SupplierRawOffer } from './booking.supplier';

export function resolveAvailability(
  offerId: string,
  seatsHint?: number | null,
): {
  state: BookingFlightAvailabilityResult['state'];
  seatsRemaining: number | null;
  detail: string;
} {
  const seed = hashSeed(`avail|${offerId}`);
  const bucket = seed % 20;
  if (bucket === 0) {
    return {
      state: 'UNAVAILABLE',
      seatsRemaining: 0,
      detail: 'Inventory sold out on recheck — pick another offer',
    };
  }
  if (bucket <= 3 || (seatsHint != null && seatsHint <= 3)) {
    const seats = seatsHint != null && seatsHint > 0 ? Math.min(seatsHint, 3) : 1 + (seed % 3);
    return {
      state: 'LIMITED',
      seatsRemaining: seats,
      detail: `Only ${seats} seat${seats === 1 ? '' : 's'} left at this fare`,
    };
  }
  if (bucket === 4) {
    return {
      state: 'WAITLIST',
      seatsRemaining: 0,
      detail: 'Cabin waitlisted — confirmation not guaranteed',
    };
  }
  const seats = seatsHint ?? 4 + (seed % 10);
  return {
    state: 'AVAILABLE',
    seatsRemaining: seats,
    detail: 'Seats available at last quoted fare class',
  };
}

export function buildAvailabilityResult(
  offerId: string,
  seatsHint?: number | null,
): BookingFlightAvailabilityResult {
  const resolved = resolveAvailability(offerId, seatsHint);
  return {
    offerId,
    state: resolved.state,
    seatsRemaining: resolved.seatsRemaining,
    detail: resolved.detail,
  };
}

export function buildFareValidateResult(input: {
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
  > &
    Partial<SupplierRawOffer>;
  context: BookingTravelContext;
}): BookingFareValidateResult {
  const seed = hashSeed(`fare|${input.offerId}`);
  const bucket = seed % 12;
  let outcome: BookingFareValidateOutcome = 'VALID';
  let currentGrossInr = input.previousGrossInr;
  let detail = 'Fare still valid at the quoted price';

  if (bucket === 0) {
    outcome = 'UNAVAILABLE';
    detail = 'Offer no longer available — search again';
  } else if (bucket <= 2) {
    outcome = 'PRICE_INCREASED';
    const bump = Math.round(input.previousGrossInr * (0.03 + (seed % 5) / 100));
    currentGrossInr = input.previousGrossInr + bump;
    detail = `Fare increased by ₹${bump.toLocaleString('en-IN')} since search`;
  } else if (bucket === 3) {
    outcome = 'PRICE_DECREASED';
    const drop = Math.round(input.previousGrossInr * (0.02 + (seed % 4) / 100));
    currentGrossInr = Math.max(1000, input.previousGrossInr - drop);
    detail = `Fare dropped by ₹${drop.toLocaleString('en-IN')} — good time to lock`;
  } else if (bucket === 4) {
    outcome = 'LIMITED';
    detail = 'Fare valid but inventory is limited';
  }

  const scale = currentGrossInr / Math.max(1, input.previousGrossInr);
  const scaledRaw = {
    ...input.raw,
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
      product: input.raw.product ?? 'FLIGHT',
      stops: input.raw.stops ?? null,
      baggageIncluded: input.raw.baggageIncluded ?? false,
      loungeEligibleHint: input.raw.loungeEligibleHint ?? false,
      baseFareInr: scaledRaw.baseFareInr,
      taxesInr: scaledRaw.taxesInr,
      feesInr: scaledRaw.feesInr,
      ancillariesInr: scaledRaw.ancillariesInr,
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
