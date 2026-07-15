import { describe, expect, it } from 'vitest';

import {
  buildBookingHub,
  buildExplanationFactors,
  buildPricingBreakdown,
  buildSearchResult,
  enrichOffer,
  rankOffers,
  resolveTravelContext,
  type BookingTravelContext,
} from '../booking.builder';
import type { SupplierRawOffer } from '../booking.supplier';

const rawFlight = (partial?: Partial<SupplierRawOffer>): SupplierRawOffer => ({
  supplierOfferId: 'flt-1',
  product: 'FLIGHT',
  title: 'Air India BLR → DEL',
  summary: 'Nonstop · 2h 30m',
  airlineOrProperty: 'Air India',
  departureAt: '2026-12-01T08:00:00.000Z',
  arrivalAt: '2026-12-01T10:30:00.000Z',
  durationMinutes: 150,
  stops: 0,
  cabinClass: 'ECONOMY',
  baggageIncluded: true,
  loungeEligibleHint: true,
  baseFareInr: 10_000,
  taxesInr: 1200,
  feesInr: 400,
  ancillariesInr: 0,
  ...partial,
});

const context: BookingTravelContext = {
  bestTravelCardUserCardId: 'uc-1',
  bestTravelCardName: 'Atlas',
  loungeCardCount: 2,
  travelOfferCount: 1,
  cashbackRate: 0.05,
  rewardValueRate: 0.04,
  offerSavingsCapInr: 2500,
};

describe('booking pricing & explainability', () => {
  it('computes effective cost as gross minus rewards and offers', () => {
    const pricing = buildPricingBreakdown(rawFlight(), context);
    expect(pricing.grossPriceInr).toBe(11_600);
    expect(pricing.cashbackInr).toBe(580);
    expect(pricing.rewardValueInr).toBe(400);
    expect(pricing.offerSavingsInr).toBeGreaterThan(0);
    expect(pricing.effectiveCostInr).toBe(
      pricing.grossPriceInr -
        pricing.cashbackInr -
        pricing.rewardValueInr -
        pricing.offerSavingsInr,
    );
  });

  it('builds explainable factors for lounge, baggage, and rewards', () => {
    const pricing = buildPricingBreakdown(rawFlight(), context);
    const factors = buildExplanationFactors(rawFlight(), pricing, context);
    const codes = factors.map((f) => f.code);
    expect(codes).toContain('EFFECTIVE_COST');
    expect(codes).toContain('CASHBACK');
    expect(codes).toContain('LOUNGE');
    expect(codes).toContain('BAGGAGE');
    expect(codes).toContain('NONSTOP');
  });

  it('ranks offers with multi-signal BEST scoring', () => {
    const cheap = enrichOffer(
      rawFlight({ supplierOfferId: 'a', baseFareInr: 8_000, taxesInr: 960, feesInr: 300 }),
      'MOCK',
      1,
      context,
    );
    const pricey = enrichOffer(
      rawFlight({
        supplierOfferId: 'b',
        baseFareInr: 15_000,
        taxesInr: 1800,
        feesInr: 400,
        durationMinutes: 90,
        stops: 2,
        baggageIncluded: false,
      }),
      'MOCK',
      2,
      context,
    );
    const ranked = rankOffers([pricey, cheap], 'BEST');
    expect(ranked[0]?.id).toContain('a');
    expect(ranked[0]?.rank).toBe(1);
    expect(ranked[0]?.rankingScores?.overall).toBeGreaterThan(
      ranked[1]?.rankingScores?.overall ?? 0,
    );
  });

  it('ranks hotels with multi-signal BEST scoring including loyalty', () => {
    const baseHotel = {
      product: 'HOTEL' as const,
      title: 'Hotel',
      summary: 'stay',
      airlineOrProperty: 'Marriott',
      departureAt: '2026-12-01T14:00:00.000Z',
      arrivalAt: '2026-12-04T11:00:00.000Z',
      durationMinutes: 4320,
      stops: null,
      cabinClass: null,
      baggageIncluded: false,
      loungeEligibleHint: true,
      taxesInr: 2000,
      feesInr: 400,
      ancillariesInr: 0,
      starRating: 5,
      roomType: 'DELUXE' as const,
      mealPlan: 'BREAKFAST' as const,
      cancellationPolicy: 'FREE_24H' as const,
      loyaltyProgram: 'Bonvoy',
      chainCode: 'MAR',
      roomsRemaining: 3,
      nightlyRateInr: 8000,
      estimatedLoyaltyPoints: 5000,
    };
    const value = enrichOffer(
      {
        ...baseHotel,
        supplierOfferId: 'a',
        baseFareInr: 18_000,
        estimatedLoyaltyPoints: 8000,
      },
      'MOCK_GDS',
      1,
      context,
    );
    const expensive = enrichOffer(
      {
        ...baseHotel,
        supplierOfferId: 'b',
        baseFareInr: 32_000,
        starRating: 3,
        mealPlan: 'ROOM_ONLY',
        cancellationPolicy: 'NON_REFUNDABLE',
        estimatedLoyaltyPoints: 500,
      },
      'MOCK_GDS',
      2,
      context,
    );
    const ranked = rankOffers([expensive, value], 'BEST');
    expect(ranked[0]?.id).toContain('a');
    expect(ranked[0]?.rankingScores?.overall).toBeGreaterThan(
      ranked[1]?.rankingScores?.overall ?? 0,
    );
  });

  it('builds search result and hub metadata', () => {
    const result = buildSearchResult({
      searchId: 'search_1',
      product: 'FLIGHT',
      query: { origin: 'BLR', destination: 'DEL' },
      batches: [{ supplierCode: 'MOCK_GDS', rawOffers: [rawFlight()] }],
      context,
      generatedAt: new Date('2026-07-14T00:00:00.000Z'),
    });
    expect(result.offerCount).toBe(1);
    expect(result.offers[0]?.recommendedCardName).toBe('Atlas');
    expect(result.offers[0]?.recommendationReason).toBeTruthy();
    expect(result.generatedAt).toBe('2026-07-14T00:00:00.000Z');

    const hub = buildBookingHub({
      code: 'MOCK_GDS',
      name: 'Mock',
      products: ['FLIGHT', 'HOTEL'],
    });
    expect(hub.suppliers[0]?.status).toBe('MOCK');
    expect(hub.lifecycleStages).toContain('SEARCH');
  });

  it('resolves travel context rates from portfolio rules', () => {
    const resolved = resolveTravelContext({
      loungeCardCount: 1,
      travelOfferCount: 2,
      bestTravelCardUserCardId: 'uc-1',
      cards: [
        {
          userCardId: 'uc-1',
          cardName: 'Magnus',
          travelRewardRules: [
            { rewardMultiplier: 5, cashbackPercent: 8 },
            { rewardMultiplier: null, cashbackPercent: 2 },
          ],
        },
      ],
    });
    expect(resolved.bestTravelCardName).toBe('Magnus');
    expect(resolved.cashbackRate).toBe(0.08);
    expect(resolved.offerSavingsCapInr).toBe(2500);
  });
});
