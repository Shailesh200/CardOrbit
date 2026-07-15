import { Injectable } from '@nestjs/common';
import type {
  BookingCabinClass,
  BookingCancellationPolicy,
  BookingFareFamily,
  BookingMealPlan,
  BookingProduct,
  BookingRoomType,
} from '@cardwise/validation';

import type {
  BookingSupplier,
  SupplierFlightSearchParams,
  SupplierHotelSearchParams,
  SupplierRawOffer,
} from './booking.supplier';
import { hashSeed } from './booking.supplier';

const AIRLINES = [
  { code: 'AI', name: 'Air India' },
  { code: '6E', name: 'IndiGo' },
  { code: 'UK', name: 'Vistara' },
  { code: 'EK', name: 'Emirates' },
] as const;

const FARE_FAMILIES: BookingFareFamily[] = ['BASIC', 'FLEX', 'PLUS'];

const ROOM_TYPES: BookingRoomType[] = ['STANDARD', 'DELUXE', 'SUITE'];
const MEAL_PLANS: BookingMealPlan[] = ['ROOM_ONLY', 'BREAKFAST', 'HALF_BOARD'];
const CANCEL_POLICIES: BookingCancellationPolicy[] = ['FREE_24H', 'MODERATE', 'NON_REFUNDABLE'];

const HOTELS = [
  {
    code: 'MAR',
    name: 'Marriott City Centre',
    chain: 'Marriott',
    chainCode: 'MAR',
    loyalty: 'Bonvoy',
    stars: 5,
  },
  {
    code: 'HIL',
    name: 'Hilton Downtown',
    chain: 'Hilton',
    chainCode: 'HIL',
    loyalty: 'Honors',
    stars: 4,
  },
  {
    code: 'TAJ',
    name: 'Taj Palace',
    chain: 'Taj',
    chainCode: 'TAJ',
    loyalty: 'Nevillage',
    stars: 5,
  },
  {
    code: 'HYA',
    name: 'Hyatt Place',
    chain: 'Hyatt',
    chainCode: 'HYA',
    loyalty: 'World of Hyatt',
    stars: 4,
  },
] as const;

const OTA_HOTELS = [
  {
    code: 'IBIS',
    name: 'ibis Styles',
    chain: 'Accor',
    chainCode: 'ACC',
    loyalty: 'ALL',
    stars: 3,
  },
  {
    code: 'LEMON',
    name: 'Lemon Tree Premier',
    chain: 'Lemon Tree',
    chainCode: 'LEM',
    loyalty: 'Lemon Tree Plus',
    stars: 4,
  },
] as const;

function cabinMultiplier(cabin: BookingCabinClass): number {
  switch (cabin) {
    case 'PREMIUM_ECONOMY':
      return 1.35;
    case 'BUSINESS':
      return 2.4;
    case 'FIRST':
      return 3.6;
    default:
      return 1;
  }
}

function fareFamilyMultiplier(family: BookingFareFamily): number {
  switch (family) {
    case 'FLEX':
      return 1.18;
    case 'PLUS':
      return 1.35;
    default:
      return 1;
  }
}

function addHours(isoDate: string, hours: number): string {
  const date = new Date(`${isoDate}T08:00:00.000Z`);
  date.setUTCHours(date.getUTCHours() + hours);
  return date.toISOString();
}

/**
 * Deterministic mock GDS — no external credentials.
 * Produces stable offers with fare families for M-055 flight depth.
 */
@Injectable()
export class MockBookingSupplier implements BookingSupplier {
  readonly code = 'MOCK_GDS';
  readonly name = 'CardWise Mock Travel Supplier';
  readonly products: BookingProduct[] = ['FLIGHT', 'HOTEL'];

  async searchFlights(params: SupplierFlightSearchParams): Promise<SupplierRawOffer[]> {
    const tripType = params.returnDate ? 'ROUND_TRIP' : 'ONE_WAY';
    const seed = hashSeed(
      `${this.code}|${params.origin}|${params.destination}|${params.departureDate}|${params.returnDate ?? ''}|${params.cabinClass}`,
    );
    const pax =
      params.passengers.adults +
      params.passengers.children * 0.75 +
      params.passengers.infants * 0.1;
    const baseRoute = 4500 + (seed % 12000);
    const mult = cabinMultiplier(params.cabinClass);
    const preferred = new Set(
      (params.preferredAirlines ?? []).map((code) => code.trim().toUpperCase()),
    );

    const offers: SupplierRawOffer[] = [];

    for (const [index, airline] of AIRLINES.entries()) {
      if (preferred.size > 0 && !preferred.has(airline.code)) continue;

      for (const [familyIndex, fareFamily] of FARE_FAMILIES.entries()) {
        // BASIC on every airline; FLEX/PLUS on first three for variety
        if (fareFamily !== 'BASIC' && index > 2) continue;

        const routeSeed = seed + index * 97 + familyIndex * 13;
        const familyMult = fareFamilyMultiplier(fareFamily);
        const roundTripMult = tripType === 'ROUND_TRIP' ? 1.85 : 1;
        const baseFareInr = Math.round(
          (baseRoute + (routeSeed % 3500)) * mult * familyMult * roundTripMult * pax,
        );
        const taxesInr = Math.round(baseFareInr * 0.12);
        const feesInr = 350 + (routeSeed % 250);
        const stops = routeSeed % 3 === 0 ? 0 : routeSeed % 3 === 1 ? 1 : 2;
        const durationMinutes =
          95 + stops * 85 + (routeSeed % 180) + (tripType === 'ROUND_TRIP' ? 40 : 0);
        const departureAt = addHours(params.departureDate, 6 + index * 2 + familyIndex);
        const arrivalAt = new Date(departureAt);
        arrivalAt.setUTCMinutes(arrivalAt.getUTCMinutes() + durationMinutes);
        const seatsRemaining = 2 + (routeSeed % 12);
        const flightNumber = `${airline.code}${100 + (routeSeed % 800)}`;

        offers.push({
          supplierOfferId: `mock-flt-${airline.code}-${fareFamily}-${params.origin}${params.destination}-${index}`,
          product: 'FLIGHT',
          title: `${airline.name} ${params.origin} → ${params.destination}${tripType === 'ROUND_TRIP' ? ' (RT)' : ''}`,
          summary: `${fareFamily} · ${stops === 0 ? 'Nonstop' : `${stops} stop${stops > 1 ? 's' : ''}`} · ${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m · ${seatsRemaining} seats`,
          airlineOrProperty: airline.name,
          airlineCode: airline.code,
          departureAt,
          arrivalAt: arrivalAt.toISOString(),
          durationMinutes,
          stops,
          cabinClass: params.cabinClass,
          baggageIncluded: fareFamily !== 'BASIC' || index !== 1,
          loungeEligibleHint:
            fareFamily === 'PLUS' || params.cabinClass !== 'ECONOMY' || index === 0,
          baseFareInr,
          taxesInr,
          feesInr,
          ancillariesInr: fareFamily === 'PLUS' ? 0 : index === 2 ? 899 : 0,
          flightNumber,
          fareFamily,
          fareBasis: `${airline.code}${fareFamily[0]}${params.cabinClass[0]}`,
          seatsRemaining,
          availabilityState: seatsRemaining <= 4 ? 'LIMITED' : 'AVAILABLE',
          tripType,
        });
      }
    }

    return offers;
  }

  async searchHotels(params: SupplierHotelSearchParams): Promise<SupplierRawOffer[]> {
    const seed = hashSeed(
      `${this.code}|${params.destination}|${params.checkInDate}|${params.checkOutDate}|${params.guests}|${params.rooms ?? 1}`,
    );
    const nights = Math.max(
      1,
      Math.round(
        (new Date(`${params.checkOutDate}T00:00:00Z`).getTime() -
          new Date(`${params.checkInDate}T00:00:00Z`).getTime()) /
          86_400_000,
      ),
    );
    const rooms = params.rooms ?? 1;
    const preferred = new Set(
      (params.preferredChains ?? []).map((value) => value.trim().toUpperCase()),
    );

    const offers: SupplierRawOffer[] = [];

    for (const [index, hotel] of HOTELS.entries()) {
      if (
        preferred.size > 0 &&
        !preferred.has(hotel.chainCode) &&
        !preferred.has(hotel.chain.toUpperCase())
      ) {
        continue;
      }

      for (const [roomIndex, roomType] of ROOM_TYPES.entries()) {
        // STANDARD for all; DELUXE/SUITE for top properties
        if (roomType !== 'STANDARD' && index > 2) continue;

        const mealPlan =
          params.mealPlan ?? MEAL_PLANS[(seed + index + roomIndex) % MEAL_PLANS.length]!;
        if (params.mealPlan && mealPlan !== params.mealPlan) continue;

        const cancel = CANCEL_POLICIES[(seed + index * 3 + roomIndex) % CANCEL_POLICIES.length]!;
        const roomMult = roomType === 'SUITE' ? 1.85 : roomType === 'DELUXE' ? 1.35 : 1;
        const mealMult = mealPlan === 'HALF_BOARD' ? 1.28 : mealPlan === 'BREAKFAST' ? 1.12 : 1;
        const routeSeed = seed + index * 97 + roomIndex * 17;
        const nightly = Math.round((3800 + (routeSeed % 9000) + hotel.stars * 400) * roomMult);
        const baseFareInr = Math.round(
          nightly * nights * rooms * (0.9 + params.guests * 0.05) * mealMult,
        );
        const taxesInr = Math.round(baseFareInr * 0.18);
        const feesInr = 350 + (routeSeed % 400);
        const roomsRemaining = 1 + (routeSeed % 9);
        const estimatedLoyaltyPoints = Math.round((baseFareInr / 100) * (2 + hotel.stars * 0.5));

        offers.push({
          supplierOfferId: `mock-htl-${hotel.code}-${roomType}-${params.destination}-${index}`,
          product: 'HOTEL',
          title: `${hotel.name} · ${params.destination}`,
          summary: `${hotel.stars}★ · ${roomType} · ${mealPlan.replace('_', ' ')} · ${nights} night${nights > 1 ? 's' : ''} · ${rooms} room${rooms > 1 ? 's' : ''}`,
          airlineOrProperty: hotel.name,
          departureAt: `${params.checkInDate}T14:00:00.000Z`,
          arrivalAt: `${params.checkOutDate}T11:00:00.000Z`,
          durationMinutes: nights * 24 * 60,
          stops: null,
          cabinClass: null,
          baggageIncluded: false,
          loungeEligibleHint: hotel.stars >= 5 || roomType === 'SUITE',
          baseFareInr,
          taxesInr,
          feesInr,
          ancillariesInr: mealPlan === 'ROOM_ONLY' ? 0 : 0,
          starRating: hotel.stars,
          roomType,
          mealPlan,
          cancellationPolicy: cancel,
          loyaltyProgram: hotel.loyalty,
          chainCode: hotel.chainCode,
          roomsRemaining,
          nightlyRateInr: nightly,
          estimatedLoyaltyPoints,
          availabilityState: roomsRemaining <= 2 ? 'LIMITED' : 'AVAILABLE',
        });
      }
    }

    return offers;
  }
}

/** Secondary mock OTA for multi-supplier fan-out (M-055 / M-056). */
@Injectable()
export class MockOtaBookingSupplier implements BookingSupplier {
  readonly code = 'MOCK_OTA';
  readonly name = 'CardWise Mock OTA Aggregator';
  readonly products: BookingProduct[] = ['FLIGHT', 'HOTEL'];

  async searchFlights(params: SupplierFlightSearchParams): Promise<SupplierRawOffer[]> {
    const seed = hashSeed(
      `${this.code}|${params.origin}|${params.destination}|${params.departureDate}|${params.cabinClass}`,
    );
    const tripType = params.returnDate ? 'ROUND_TRIP' : 'ONE_WAY';
    const pax = params.passengers.adults + params.passengers.children * 0.7;
    const mult = cabinMultiplier(params.cabinClass);
    const airlines = [
      { code: 'SG', name: 'SpiceJet' },
      { code: 'QP', name: 'Akasa Air' },
    ] as const;

    return airlines.map((airline, index) => {
      const routeSeed = seed + index * 41;
      const baseFareInr = Math.round(
        (3800 + (routeSeed % 9000)) * mult * (tripType === 'ROUND_TRIP' ? 1.8 : 1) * pax,
      );
      const taxesInr = Math.round(baseFareInr * 0.11);
      const stops = index === 0 ? 0 : 1;
      const durationMinutes = 110 + stops * 95 + (routeSeed % 90);
      const departureAt = addHours(params.departureDate, 9 + index * 3);
      const arrivalAt = new Date(departureAt);
      arrivalAt.setUTCMinutes(arrivalAt.getUTCMinutes() + durationMinutes);
      const seatsRemaining = 1 + (routeSeed % 8);

      return {
        supplierOfferId: `ota-flt-${airline.code}-${params.origin}${params.destination}-${index}`,
        product: 'FLIGHT' as const,
        title: `${airline.name} ${params.origin} → ${params.destination}`,
        summary: `BASIC · ${stops === 0 ? 'Nonstop' : '1 stop'} · ${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`,
        airlineOrProperty: airline.name,
        airlineCode: airline.code,
        departureAt,
        arrivalAt: arrivalAt.toISOString(),
        durationMinutes,
        stops,
        cabinClass: params.cabinClass,
        baggageIncluded: false,
        loungeEligibleHint: false,
        baseFareInr,
        taxesInr,
        feesInr: 299 + (routeSeed % 120),
        ancillariesInr: 499,
        flightNumber: `${airline.code}${200 + (routeSeed % 600)}`,
        fareFamily: 'BASIC' as const,
        fareBasis: `${airline.code}B`,
        seatsRemaining,
        availabilityState: seatsRemaining <= 3 ? ('LIMITED' as const) : ('AVAILABLE' as const),
        tripType,
      };
    });
  }

  async searchHotels(params: SupplierHotelSearchParams): Promise<SupplierRawOffer[]> {
    const seed = hashSeed(
      `${this.code}|htl|${params.destination}|${params.checkInDate}|${params.checkOutDate}`,
    );
    const nights = Math.max(
      1,
      Math.round(
        (new Date(`${params.checkOutDate}T00:00:00Z`).getTime() -
          new Date(`${params.checkInDate}T00:00:00Z`).getTime()) /
          86_400_000,
      ),
    );
    const rooms = params.rooms ?? 1;

    return OTA_HOTELS.map((hotel, index) => {
      const routeSeed = seed + index * 53;
      const nightly = 2800 + (routeSeed % 5000);
      const baseFareInr = Math.round(nightly * nights * rooms * (0.85 + params.guests * 0.04));
      const taxesInr = Math.round(baseFareInr * 0.16);
      const roomsRemaining = 2 + (routeSeed % 6);
      return {
        supplierOfferId: `ota-htl-${hotel.code}-${params.destination}-${index}`,
        product: 'HOTEL' as const,
        title: `${hotel.name} · ${params.destination}`,
        summary: `${hotel.stars}★ · STANDARD · BREAKFAST · ${nights} night${nights > 1 ? 's' : ''}`,
        airlineOrProperty: hotel.name,
        departureAt: `${params.checkInDate}T14:00:00.000Z`,
        arrivalAt: `${params.checkOutDate}T11:00:00.000Z`,
        durationMinutes: nights * 24 * 60,
        stops: null,
        cabinClass: null,
        baggageIncluded: false,
        loungeEligibleHint: false,
        baseFareInr,
        taxesInr,
        feesInr: 199 + (routeSeed % 150),
        ancillariesInr: 0,
        starRating: hotel.stars,
        roomType: 'STANDARD' as const,
        mealPlan: 'BREAKFAST' as const,
        cancellationPolicy: 'MODERATE' as const,
        loyaltyProgram: hotel.loyalty,
        chainCode: hotel.chainCode,
        roomsRemaining,
        nightlyRateInr: nightly,
        estimatedLoyaltyPoints: Math.round(baseFareInr / 120),
        availabilityState: roomsRemaining <= 2 ? ('LIMITED' as const) : ('AVAILABLE' as const),
      };
    });
  }
}
