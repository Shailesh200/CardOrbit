import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  initAnalytics,
  trackBookingChannelRecommended,
  trackBookingFareValidated,
  trackBookingHubViewed,
  trackBookingLoyaltyOptimized,
  trackBookingOfferSelected,
  trackBookingPaymentOptimized,
  trackBookingPortalHandoffClicked,
  trackBookingPricingViewed,
  trackBookingSearchPerformed,
} from '@cardwise/analytics';
import { FeatureFlag } from '@cardwise/feature-flags';
import {
  parseBookingChannelRecommendInput,
  parseBookingFareValidateInput,
  parseBookingFlightAvailabilityInput,
  parseBookingFlightSearchInput,
  parseBookingHotelAvailabilityInput,
  parseBookingHotelSearchInput,
  parseBookingLoyaltyOptimizeInput,
  parseBookingPaymentOptimizeInput,
  parseBookingPortalHandoffInput,
  parseBookingPricingInput,
  parseBookingRateValidateInput,
  parseBookingSearchInput,
  type BookingChannelRecommendResult,
  type BookingFareValidateResult,
  type BookingFlightAvailabilityResult,
  type BookingFlightSearchInput,
  type BookingHotelAvailabilityResult,
  type BookingHotelSearchInput,
  type BookingHub,
  type BookingLoyaltyOptimizeResult,
  type BookingOffer,
  type BookingPaymentOptimizeResult,
  type BookingPortalHandoffResult,
  type BookingPricingResult,
  type BookingRateValidateResult,
  type BookingSearchResult,
} from '@cardwise/validation';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import { TravelHubService } from '../travel-hub/travel-hub.service';
import {
  buildBookingHub,
  buildPricingResult,
  buildSearchResult,
  flightSearchToQuery,
  hotelSearchToQuery,
  resolveTravelContext,
  type BookingTravelContext,
} from './booking.builder';
import { BOOKING_SUPPLIERS, type BookingSupplier } from './booking.supplier';
import { findPortalById } from './catalog/issuer-travel-portals';
import {
  buildChannelRecommendResult,
  buildDeepLinkUrl,
  type ChannelPortfolioCard,
} from './channel-ranker.builder';
import { buildAvailabilityResult, buildFareValidateResult } from './flight-fare.builder';
import { buildHotelAvailabilityResult, buildRateValidateResult } from './hotel-inventory.builder';
import { buildLoyaltyOptimizeResult } from './loyalty-optimize.builder';
import { buildPaymentOptimizeResult, type PaymentOptimizeCard } from './payment-optimize.builder';

type CachedSearch = {
  expiresAt: number;
  result: BookingSearchResult;
};

@Injectable()
export class BookingService {
  private analyticsReady = false;
  private readonly searchCache = new Map<string, CachedSearch>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly featureFlags: FeatureFlagsService,
    private readonly travelHub: TravelHubService,
    @Inject(BOOKING_SUPPLIERS) private readonly suppliers: BookingSupplier[],
  ) {}

  async getHub(userId: string): Promise<BookingHub> {
    await this.requireActiveUser(userId);
    await this.requireBookingEnabled(userId);
    const primary = this.suppliers[0]!;
    const hub = buildBookingHub(primary);
    hub.suppliers = [
      ...this.suppliers.map((supplier) => ({
        code: supplier.code,
        name: supplier.name,
        products: [...supplier.products],
        status: 'MOCK' as const,
      })),
      {
        code: 'PORTAL_HANDOFF',
        name: 'Issuer travel portals',
        products: ['FLIGHT', 'HOTEL'],
        status: 'LIVE',
      },
    ];
    hub.notes = [
      'M-054 foundation: supplier-agnostic search + explainable effective-cost pricing.',
      'M-055 flight depth: multi-supplier mock inventory, fare validation, payment-card optimization.',
      'M-056 hotel depth: multi-supplier properties, rate validation, loyalty-path optimization.',
      'Issuer portals are PORTAL_HANDOFF channels — deep-link, not iframe.',
      'Effective cost = base + taxes/fees − cashback − reward value − offer savings.',
    ];
    this.trackHub(userId, hub);
    return hub;
  }

  async search(userId: string, raw: unknown): Promise<BookingSearchResult> {
    await this.requireActiveUser(userId);
    await this.requireBookingEnabled(userId);
    const input = parseBookingSearchInput(raw);

    if (input.product === 'FLIGHT') {
      return this.searchFlights(userId, {
        origin: input.origin ?? 'BLR',
        destination: (input.destination ?? 'DEL').slice(0, 3),
        departureDate: input.departureDate ?? defaultDepartureDate(),
        returnDate: input.returnDate,
        tripType: input.returnDate ? 'ROUND_TRIP' : 'ONE_WAY',
        passengers: input.passengers,
        cabinClass: input.cabinClass,
        userCardId: input.userCardId,
      });
    }

    if (!input.destination || !input.checkInDate || !input.checkOutDate) {
      throw new BadRequestException(
        'Hotel search requires destination, checkInDate, and checkOutDate',
      );
    }

    return this.searchHotels(userId, {
      destination: input.destination,
      checkInDate: input.checkInDate,
      checkOutDate: input.checkOutDate,
      guests: input.guests ?? input.passengers.adults,
      rooms: input.rooms ?? 1,
      minStarRating: input.minStarRating,
      preferredChains: input.preferredChains,
      mealPlan: input.mealPlan,
      sortBy: (input.sortBy as BookingHotelSearchInput['sortBy']) ?? 'BEST',
      userCardId: input.userCardId,
    });
  }

  async searchHotels(userId: string, raw: unknown): Promise<BookingSearchResult> {
    await this.requireActiveUser(userId);
    await this.requireBookingEnabled(userId);
    const input = parseBookingHotelSearchInput(raw) as BookingHotelSearchInput;
    if (input.checkOutDate <= input.checkInDate) {
      throw new BadRequestException('checkOutDate must be after checkInDate');
    }

    const context = await this.loadTravelContext(userId);
    const hotelSuppliers = this.suppliers.filter((s) => s.products.includes('HOTEL'));
    const batches = await Promise.all(
      hotelSuppliers.map(async (supplier) => ({
        supplierCode: supplier.code,
        rawOffers: await supplier.searchHotels({
          destination: input.destination,
          checkInDate: input.checkInDate,
          checkOutDate: input.checkOutDate,
          guests: input.guests,
          rooms: input.rooms,
          preferredChains: input.preferredChains,
          mealPlan: input.mealPlan,
        }),
      })),
    );

    const result = buildSearchResult({
      searchId: `search_${randomUUID()}`,
      product: 'HOTEL',
      query: hotelSearchToQuery(input),
      batches,
      context,
      minStarRating: input.minStarRating,
      preferredChains: input.preferredChains,
      mealPlan: input.mealPlan,
      sortBy: input.sortBy,
    });
    this.cacheSearch(result);
    this.trackSearch(userId, result);
    return result;
  }

  async searchFlights(userId: string, raw: unknown): Promise<BookingSearchResult> {
    await this.requireActiveUser(userId);
    await this.requireBookingEnabled(userId);
    const input = parseBookingFlightSearchInput(raw) as BookingFlightSearchInput;
    if (input.origin === input.destination) {
      throw new BadRequestException('Origin and destination must differ');
    }
    if (input.returnDate && input.returnDate < input.departureDate) {
      throw new BadRequestException('returnDate must be on or after departureDate');
    }
    const tripType = input.tripType === 'ROUND_TRIP' || input.returnDate ? 'ROUND_TRIP' : 'ONE_WAY';
    if (tripType === 'ROUND_TRIP' && !input.returnDate) {
      throw new BadRequestException('returnDate is required for ROUND_TRIP');
    }

    const context = await this.loadTravelContext(userId);
    const flightSuppliers = this.suppliers.filter((s) => s.products.includes('FLIGHT'));
    const batches = await Promise.all(
      flightSuppliers.map(async (supplier) => ({
        supplierCode: supplier.code,
        rawOffers: await supplier.searchFlights({
          origin: input.origin,
          destination: input.destination,
          departureDate: input.departureDate,
          returnDate: input.returnDate,
          passengers: input.passengers,
          cabinClass: input.cabinClass,
          preferredAirlines: input.preferredAirlines,
        }),
      })),
    );

    const result = buildSearchResult({
      searchId: `search_${randomUUID()}`,
      product: 'FLIGHT',
      query: flightSearchToQuery({ ...input, tripType }),
      batches,
      context,
      maxStops: input.maxStops,
      preferredAirlines: input.preferredAirlines,
      sortBy: input.sortBy,
    });
    this.cacheSearch(result);
    this.trackSearch(userId, result);
    return result;
  }

  async checkAvailability(userId: string, raw: unknown): Promise<BookingFlightAvailabilityResult> {
    await this.requireActiveUser(userId);
    await this.requireBookingEnabled(userId);
    const input = parseBookingFlightAvailabilityInput(raw);
    const offer = this.findCachedOffer(input.offerId, input.searchId);
    const result = buildAvailabilityResult(input.offerId, offer?.seatsRemaining ?? null);
    try {
      this.ensureAnalytics();
      trackBookingOfferSelected(
        {
          offerId: input.offerId,
          product: 'FLIGHT',
          supplierCode: offer?.supplierCode ?? 'UNKNOWN',
        },
        { distinctId: userId },
      );
    } catch {
      // ignore
    }
    return result;
  }

  async validateFare(userId: string, raw: unknown): Promise<BookingFareValidateResult> {
    await this.requireActiveUser(userId);
    await this.requireBookingEnabled(userId);
    const input = parseBookingFareValidateInput(raw);
    const context = await this.loadTravelContext(userId);
    const offer = this.findCachedOffer(input.offerId, input.searchId);
    const previousGrossInr = input.grossPriceInr ?? offer?.pricing.grossPriceInr ?? 25_000;
    const result = buildFareValidateResult({
      offerId: input.offerId,
      previousGrossInr,
      raw: {
        product: input.product,
        baseFareInr: offer
          ? Math.round(offer.pricing.baseFareInr)
          : Math.round(previousGrossInr / 1.15),
        taxesInr: offer?.pricing.taxesInr ?? Math.round(previousGrossInr * 0.1),
        feesInr: offer?.pricing.feesInr ?? 400,
        ancillariesInr: offer?.pricing.ancillariesInr ?? 0,
        baggageIncluded: offer?.baggageIncluded ?? false,
        loungeEligibleHint: offer?.loungeEligible ?? false,
        stops: offer?.stops ?? null,
      },
      context,
    });
    try {
      this.ensureAnalytics();
      trackBookingFareValidated(
        {
          offerId: input.offerId,
          outcome: result.outcome,
          priceDeltaInr: result.priceDeltaInr,
        },
        { distinctId: userId },
      );
    } catch {
      // ignore
    }
    return result;
  }

  async checkHotelAvailability(
    userId: string,
    raw: unknown,
  ): Promise<BookingHotelAvailabilityResult> {
    await this.requireActiveUser(userId);
    await this.requireBookingEnabled(userId);
    const input = parseBookingHotelAvailabilityInput(raw);
    const offer = this.findCachedOffer(input.offerId, input.searchId);
    const result = buildHotelAvailabilityResult(input.offerId, offer?.roomsRemaining ?? null);
    try {
      this.ensureAnalytics();
      trackBookingOfferSelected(
        {
          offerId: input.offerId,
          product: 'HOTEL',
          supplierCode: offer?.supplierCode ?? 'UNKNOWN',
        },
        { distinctId: userId },
      );
    } catch {
      // ignore
    }
    return result;
  }

  async validateHotelRate(userId: string, raw: unknown): Promise<BookingRateValidateResult> {
    await this.requireActiveUser(userId);
    await this.requireBookingEnabled(userId);
    const input = parseBookingRateValidateInput(raw);
    const context = await this.loadTravelContext(userId);
    const offer = this.findCachedOffer(input.offerId, input.searchId);
    const previousGrossInr = input.grossPriceInr ?? offer?.pricing.grossPriceInr ?? 18_000;
    const result = buildRateValidateResult({
      offerId: input.offerId,
      previousGrossInr,
      raw: {
        product: 'HOTEL',
        baseFareInr: offer
          ? Math.round(offer.pricing.baseFareInr)
          : Math.round(previousGrossInr / 1.2),
        taxesInr: offer?.pricing.taxesInr ?? Math.round(previousGrossInr * 0.15),
        feesInr: offer?.pricing.feesInr ?? 400,
        ancillariesInr: offer?.pricing.ancillariesInr ?? 0,
        baggageIncluded: false,
        loungeEligibleHint: offer?.loungeEligible ?? false,
        stops: null,
        mealPlan: offer?.mealPlan ?? null,
        loyaltyProgram: offer?.loyaltyProgram ?? null,
      },
      context,
    });
    try {
      this.ensureAnalytics();
      trackBookingFareValidated(
        {
          offerId: input.offerId,
          outcome: result.outcome,
          priceDeltaInr: result.priceDeltaInr,
        },
        { distinctId: userId },
      );
    } catch {
      // ignore
    }
    return result;
  }

  async optimizeLoyalty(userId: string, raw: unknown): Promise<BookingLoyaltyOptimizeResult> {
    await this.requireActiveUser(userId);
    await this.requireBookingEnabled(userId);
    const input = parseBookingLoyaltyOptimizeInput(raw);
    const context = await this.loadTravelContext(userId);
    const offer = input.offerId ? this.findCachedOffer(input.offerId, input.searchId) : null;
    const grossPriceInr = input.grossPriceInr;
    const result = buildLoyaltyOptimizeResult({
      offerId: input.offerId ?? offer?.id ?? null,
      grossPriceInr,
      context: {
        cardRewardRate: Math.min(0.18, context.cashbackRate + context.rewardValueRate),
        portalAccelerationRate: 0.11 + Math.min(0.06, context.cashbackRate),
        chainEarnRate:
          0.08 +
          Math.min(
            0.05,
            (input.estimatedLoyaltyPoints ?? offer?.estimatedLoyaltyPoints ?? 0) / 50_000,
          ),
        redeemablePoints:
          input.estimatedLoyaltyPoints ?? Math.round((offer?.estimatedLoyaltyPoints ?? 0) * 12),
        preferredCardName: context.bestTravelCardName,
        loyaltyProgram: input.loyaltyProgram ?? offer?.loyaltyProgram ?? 'Hotel loyalty',
      },
    });
    try {
      this.ensureAnalytics();
      trackBookingLoyaltyOptimized(
        {
          pathCount: result.pathCount,
          recommendedPath: result.recommendedPath,
          offerId: result.offerId,
        },
        { distinctId: userId },
      );
    } catch {
      // ignore
    }
    return result;
  }

  async price(userId: string, raw: unknown): Promise<BookingPricingResult> {
    await this.requireActiveUser(userId);
    await this.requireBookingEnabled(userId);
    const input = parseBookingPricingInput(raw);
    const context = await this.loadTravelContext(userId);
    const offer = this.findCachedOffer(input.offerId, input.searchId);
    const grossPriceInr = input.grossPriceInr ?? offer?.pricing.grossPriceInr ?? 25_000;
    const result = buildPricingResult({
      offerId: input.offerId,
      product: input.product,
      grossPriceInr,
      context,
    });
    try {
      this.ensureAnalytics();
      trackBookingPricingViewed(
        {
          product: input.product,
          effectiveCostInr: result.pricing.effectiveCostInr,
        },
        { distinctId: userId },
      );
    } catch {
      // ignore
    }
    return result;
  }

  async optimizePayment(userId: string, raw: unknown): Promise<BookingPaymentOptimizeResult> {
    await this.requireActiveUser(userId);
    await this.requireBookingEnabled(userId);
    const input = parseBookingPaymentOptimizeInput(raw);
    const [overview, cards] = await Promise.all([
      this.travelHub.getOverview(userId).catch(() => null),
      this.loadPaymentCards(userId),
    ]);
    const preferred = input.userCardId ?? overview?.bestTravelCardUserCardId ?? null;
    const result = buildPaymentOptimizeResult({
      offerId: input.offerId,
      product: input.product,
      grossPriceInr: input.grossPriceInr,
      cards,
      preferredUserCardId: preferred,
    });
    try {
      this.ensureAnalytics();
      trackBookingPaymentOptimized(
        {
          product: input.product,
          cardCount: result.cardCount,
          recommendedUserCardId: result.recommendedUserCardId,
        },
        { distinctId: userId },
      );
    } catch {
      // ignore
    }
    return result;
  }

  async recommendChannels(userId: string, raw: unknown): Promise<BookingChannelRecommendResult> {
    await this.requireActiveUser(userId);
    await this.requireBookingEnabled(userId);
    const input = parseBookingChannelRecommendInput(raw);
    const [travelContext, cards] = await Promise.all([
      this.loadTravelContext(userId),
      this.loadPortfolioCards(userId),
    ]);

    const result = buildChannelRecommendResult({
      product: input.product,
      recommendInput: input,
      context: {
        cards,
        preferredUserCardId: input.userCardId ?? travelContext.bestTravelCardUserCardId,
      },
      directEffectiveCostInr: input.directEffectiveCostInr ?? null,
      recommendedUserCardId: travelContext.bestTravelCardUserCardId,
      recommendedCardName: travelContext.bestTravelCardName,
    });

    try {
      this.ensureAnalytics();
      const portals = result.channels.filter((c) => c.kind === 'PORTAL_HANDOFF');
      trackBookingChannelRecommended(
        {
          product: result.product,
          channelCount: result.channelCount,
          topChannelSlug: result.channels[0]?.slug ?? null,
          portalCount: portals.length,
        },
        { distinctId: userId },
      );
    } catch {
      // ignore
    }

    return result;
  }

  async recordPortalHandoff(userId: string, raw: unknown): Promise<BookingPortalHandoffResult> {
    await this.requireActiveUser(userId);
    await this.requireBookingEnabled(userId);
    const input = parseBookingPortalHandoffInput(raw);
    const portal = findPortalById(input.channelId);
    if (!portal) {
      throw new NotFoundException('Booking channel not found');
    }

    const { url } = buildDeepLinkUrl(portal, {
      product: input.product,
    });
    const deepLinkUrl = input.deepLinkUrl ?? url;

    try {
      this.ensureAnalytics();
      trackBookingPortalHandoffClicked(
        {
          channelId: portal.id,
          slug: portal.slug,
          product: input.product,
        },
        { distinctId: userId },
      );
    } catch {
      // ignore
    }

    return {
      ok: true,
      channelId: portal.id,
      deepLinkUrl,
    };
  }

  private cacheSearch(result: BookingSearchResult) {
    this.pruneCache();
    this.searchCache.set(result.searchId, {
      result,
      expiresAt: Date.now() + 30 * 60_000,
    });
  }

  private findCachedOffer(offerId: string, searchId?: string): BookingOffer | null {
    this.pruneCache();
    if (searchId) {
      const cached = this.searchCache.get(searchId);
      return cached?.result.offers.find((offer) => offer.id === offerId) ?? null;
    }
    for (const entry of this.searchCache.values()) {
      const match = entry.result.offers.find((offer) => offer.id === offerId);
      if (match) return match;
    }
    return null;
  }

  private pruneCache() {
    const now = Date.now();
    for (const [key, value] of this.searchCache.entries()) {
      if (value.expiresAt < now) this.searchCache.delete(key);
    }
  }

  private async loadPortfolioCards(userId: string): Promise<ChannelPortfolioCard[]> {
    const rows = await this.prisma.userCard.findMany({
      where: { userId, status: 'ACTIVE' },
      include: {
        creditCard: { include: { bank: true } },
      },
      take: 50,
    });
    return rows.map((row) => ({
      userCardId: row.id,
      cardName: row.nickname ?? row.creditCard.name,
      bankName: row.creditCard.bank.name,
      bankSlug: row.creditCard.bank.slug,
    }));
  }

  private async loadPaymentCards(userId: string): Promise<PaymentOptimizeCard[]> {
    try {
      const overview = await this.travelHub.getOverview(userId);
      return overview.cards.map((card) => {
        const cashbackPercents = card.travelRewardRules
          .map((rule) => rule.cashbackPercent)
          .filter((value): value is number => value != null && value > 0);
        const multipliers = card.travelRewardRules
          .map((rule) => rule.rewardMultiplier)
          .filter((value): value is number => value != null && value > 0);
        const maxCashback = cashbackPercents.length > 0 ? Math.max(...cashbackPercents) : 2;
        const maxMultiplier = multipliers.length > 0 ? Math.max(...multipliers) : 1.5;
        return {
          userCardId: card.userCardId,
          cardName: card.cardName,
          bankName: card.bankName,
          cashbackRate: Math.min(0.12, maxCashback / 100),
          rewardValueRate: Math.min(0.15, maxMultiplier * 0.015),
        };
      });
    } catch {
      return [];
    }
  }

  private async loadTravelContext(userId: string): Promise<BookingTravelContext> {
    try {
      const overview = await this.travelHub.getOverview(userId);
      return resolveTravelContext(overview);
    } catch {
      return resolveTravelContext({
        loungeCardCount: 0,
        travelOfferCount: 0,
        bestTravelCardUserCardId: null,
        cards: [],
      });
    }
  }

  private async requireBookingEnabled(userId: string) {
    const enabled = await this.featureFlags.isEnabled(FeatureFlag.TRAVEL_BOOKING_ENABLED, userId);
    if (!enabled) {
      throw new NotFoundException('Booking engine is not enabled');
    }
  }

  private async requireActiveUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.accountStatus !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }
  }

  private ensureAnalytics() {
    if (this.analyticsReady) return;
    try {
      initAnalytics({});
      this.analyticsReady = true;
    } catch {
      // ignore
    }
  }

  private trackHub(userId: string, hub: BookingHub) {
    try {
      this.ensureAnalytics();
      trackBookingHubViewed(
        {
          supportedProductCount: hub.supportedProducts.length,
          supplierCount: hub.suppliers.length,
        },
        { distinctId: userId },
      );
    } catch {
      // ignore
    }
  }

  private trackSearch(userId: string, result: BookingSearchResult) {
    try {
      this.ensureAnalytics();
      trackBookingSearchPerformed(
        {
          product: result.product,
          offerCount: result.offerCount,
          supplierCount: result.suppliersQueried.length,
        },
        { distinctId: userId },
      );
    } catch {
      // ignore
    }
  }
}

function defaultDepartureDate(): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 21);
  return date.toISOString().slice(0, 10);
}
