import { describe, expect, it } from 'vitest';

import { buildHotelAvailabilityResult, buildRateValidateResult } from '../hotel-inventory.builder';
import { buildLoyaltyOptimizeResult } from '../loyalty-optimize.builder';

describe('hotel inventory builders', () => {
  it('returns deterministic room availability for an offer id', () => {
    const a = buildHotelAvailabilityResult('MOCK_GDS:mock-htl-MAR-STANDARD-GOA-0', 4);
    const b = buildHotelAvailabilityResult('MOCK_GDS:mock-htl-MAR-STANDARD-GOA-0', 4);
    expect(a).toEqual(b);
    expect(['AVAILABLE', 'LIMITED', 'WAITLIST', 'UNAVAILABLE']).toContain(a.state);
  });

  it('revalidates hotel rate with refreshed pricing', () => {
    const result = buildRateValidateResult({
      offerId: 'offer-1',
      previousGrossInr: 20_000,
      raw: {
        product: 'HOTEL',
        baseFareInr: 16_000,
        taxesInr: 3_000,
        feesInr: 1_000,
        ancillariesInr: 0,
        baggageIncluded: false,
        loungeEligibleHint: true,
        stops: null,
        mealPlan: 'BREAKFAST',
        loyaltyProgram: 'Bonvoy',
      },
      context: {
        bestTravelCardUserCardId: 'uc1',
        bestTravelCardName: 'Travel Elite',
        loungeCardCount: 1,
        travelOfferCount: 1,
        cashbackRate: 0.04,
        rewardValueRate: 0.05,
        offerSavingsCapInr: 1000,
      },
    });
    expect(result.offerId).toBe('offer-1');
    expect(result.pricing.currency).toBe('INR');
    expect(result.priceDeltaInr).toBe(result.currentGrossInr - result.previousGrossInr);
  });
});

describe('loyalty optimize builder', () => {
  it('ranks paths by lower effective stay cost', () => {
    const result = buildLoyaltyOptimizeResult({
      offerId: 'htl-1',
      grossPriceInr: 25_000,
      context: {
        cardRewardRate: 0.06,
        portalAccelerationRate: 0.14,
        chainEarnRate: 0.09,
        redeemablePoints: 40_000,
        pointValueInr: 0.4,
        preferredCardName: 'HDFC Regalia',
        loyaltyProgram: 'Bonvoy',
      },
    });
    expect(result.pathCount).toBeGreaterThanOrEqual(3);
    expect(result.paths[0]?.selected).toBe(true);
    for (let i = 1; i < result.paths.length; i += 1) {
      expect(result.paths[i]!.estimatedEffectiveCostInr).toBeGreaterThanOrEqual(
        result.paths[i - 1]!.estimatedEffectiveCostInr,
      );
    }
  });
});
