import { describe, expect, it } from 'vitest';

import { MockBookingSupplier, MockOtaBookingSupplier } from '../mock-booking.supplier';

describe('mock flight suppliers', () => {
  it('returns deterministic fare-family inventory from MOCK_GDS', async () => {
    const supplier = new MockBookingSupplier();
    const params = {
      origin: 'BLR',
      destination: 'DEL',
      departureDate: '2026-12-01',
      returnDate: '2026-12-10',
      passengers: { adults: 1, children: 0, infants: 0 },
      cabinClass: 'ECONOMY' as const,
    };
    const a = await supplier.searchFlights(params);
    const b = await supplier.searchFlights(params);
    expect(a.length).toBeGreaterThan(4);
    expect(a).toEqual(b);
    expect(a.some((offer) => offer.fareFamily === 'PLUS')).toBe(true);
    expect(a.every((offer) => offer.tripType === 'ROUND_TRIP')).toBe(true);
  });

  it('returns secondary OTA offers for multi-supplier fan-out', async () => {
    const ota = new MockOtaBookingSupplier();
    const offers = await ota.searchFlights({
      origin: 'BOM',
      destination: 'GOI',
      departureDate: '2026-11-01',
      passengers: { adults: 2, children: 0, infants: 0 },
      cabinClass: 'ECONOMY',
    });
    expect(offers.length).toBe(2);
    expect(offers[0]?.airlineCode).toBeTruthy();
  });
});

describe('mock hotel suppliers', () => {
  it('returns room-type loyalty inventory from MOCK_GDS', async () => {
    const supplier = new MockBookingSupplier();
    const params = {
      destination: 'GOA',
      checkInDate: '2026-12-01',
      checkOutDate: '2026-12-04',
      guests: 2,
      rooms: 1,
    };
    const a = await supplier.searchHotels(params);
    const b = await supplier.searchHotels(params);
    expect(a.length).toBeGreaterThan(4);
    expect(a).toEqual(b);
    expect(a.every((offer) => offer.product === 'HOTEL')).toBe(true);
    expect(a.some((offer) => offer.loyaltyProgram === 'Bonvoy')).toBe(true);
    expect(a.some((offer) => offer.roomType === 'SUITE')).toBe(true);
  });

  it('returns OTA hotel offers for multi-supplier fan-out', async () => {
    const ota = new MockOtaBookingSupplier();
    const offers = await ota.searchHotels({
      destination: 'DEL',
      checkInDate: '2026-11-10',
      checkOutDate: '2026-11-12',
      guests: 1,
      rooms: 1,
    });
    expect(offers.length).toBe(2);
    expect(offers[0]?.starRating).toBeTruthy();
  });
});
