import { describe, expect, it } from 'vitest';

import { buildAvailabilityResult, buildFareValidateResult } from '../flight-fare.builder';
import type { BookingTravelContext } from '../booking.builder';

const context: BookingTravelContext = {
  bestTravelCardUserCardId: 'uc-1',
  bestTravelCardName: 'Atlas',
  loungeCardCount: 1,
  travelOfferCount: 0,
  cashbackRate: 0.04,
  rewardValueRate: 0.03,
  offerSavingsCapInr: 0,
};

describe('flight fare builders', () => {
  it('returns deterministic availability for an offer id', () => {
    const a = buildAvailabilityResult('offer-stable-1', 5);
    const b = buildAvailabilityResult('offer-stable-1', 5);
    expect(a).toEqual(b);
    expect(['AVAILABLE', 'LIMITED', 'WAITLIST', 'UNAVAILABLE']).toContain(a.state);
  });

  it('revalidates fare with deterministic outcome and refreshed pricing', () => {
    const first = buildFareValidateResult({
      offerId: 'offer-fare-1',
      previousGrossInr: 20_000,
      raw: {
        product: 'FLIGHT',
        baseFareInr: 17_000,
        taxesInr: 2_000,
        feesInr: 1_000,
        ancillariesInr: 0,
        baggageIncluded: true,
        loungeEligibleHint: false,
        stops: 0,
      },
      context,
    });
    const second = buildFareValidateResult({
      offerId: 'offer-fare-1',
      previousGrossInr: 20_000,
      raw: {
        product: 'FLIGHT',
        baseFareInr: 17_000,
        taxesInr: 2_000,
        feesInr: 1_000,
        ancillariesInr: 0,
        baggageIncluded: true,
        loungeEligibleHint: false,
        stops: 0,
      },
      context,
    });
    expect(first.outcome).toBe(second.outcome);
    expect(first.priceDeltaInr).toBe(second.priceDeltaInr);
    expect(first.pricing.effectiveCostInr).toBeLessThanOrEqual(first.currentGrossInr);
  });
});
