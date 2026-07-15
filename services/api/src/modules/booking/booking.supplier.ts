import type {
  BookingAvailabilityState,
  BookingCabinClass,
  BookingCancellationPolicy,
  BookingFareFamily,
  BookingMealPlan,
  BookingPassengers,
  BookingProduct,
  BookingRoomType,
} from '@cardwise/validation';

/** Supplier-raw offer before CardWise pricing / explainability enrichment. */
export type SupplierRawOffer = {
  supplierOfferId: string;
  product: BookingProduct;
  title: string;
  summary: string;
  airlineOrProperty: string;
  departureAt: string | null;
  arrivalAt: string | null;
  durationMinutes: number | null;
  stops: number | null;
  cabinClass: BookingCabinClass | null;
  baggageIncluded: boolean;
  loungeEligibleHint: boolean;
  baseFareInr: number;
  taxesInr: number;
  feesInr: number;
  ancillariesInr: number;
  flightNumber?: string | null;
  fareFamily?: BookingFareFamily | null;
  fareBasis?: string | null;
  seatsRemaining?: number | null;
  availabilityState?: BookingAvailabilityState | null;
  tripType?: 'ONE_WAY' | 'ROUND_TRIP' | null;
  airlineCode?: string | null;
  starRating?: number | null;
  roomType?: BookingRoomType | null;
  mealPlan?: BookingMealPlan | null;
  cancellationPolicy?: BookingCancellationPolicy | null;
  loyaltyProgram?: string | null;
  chainCode?: string | null;
  roomsRemaining?: number | null;
  nightlyRateInr?: number | null;
  estimatedLoyaltyPoints?: number | null;
};

export type SupplierFlightSearchParams = {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string | null;
  passengers: BookingPassengers;
  cabinClass: BookingCabinClass;
  preferredAirlines?: string[];
};

export type SupplierHotelSearchParams = {
  destination: string;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  rooms?: number;
  preferredChains?: string[];
  mealPlan?: BookingMealPlan;
};

export type BookingSupplier = {
  readonly code: string;
  readonly name: string;
  readonly products: BookingProduct[];
  searchFlights(params: SupplierFlightSearchParams): Promise<SupplierRawOffer[]>;
  searchHotels(params: SupplierHotelSearchParams): Promise<SupplierRawOffer[]>;
};

export const BOOKING_SUPPLIER = Symbol('BOOKING_SUPPLIER');
export const BOOKING_SUPPLIERS = Symbol('BOOKING_SUPPLIERS');

export function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
