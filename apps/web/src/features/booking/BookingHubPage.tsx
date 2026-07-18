import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Button } from '@cardwise/ui';
import { Building2, ExternalLink, Plane } from 'lucide-react';

import { PageBackLink } from '@layout/PageBackLink';
import { notify, toast } from '@lib/app-toast';
import { formatOfferTitle } from '@features/offers/format-offer-title';
import {
  defaultFlightDates,
  defaultHotelDates,
  formatBookingInr,
  getBookingHub,
  optimizeBookingPayment,
  optimizeHotelLoyalty,
  recommendBookingChannels,
  recordPortalHandoff,
  searchFlights,
  searchHotels,
  validateFlightFare,
  validateHotelRate,
  type BookingCabinClass,
  type BookingChannelRecommendResult,
  type BookingChannelRecommendation,
  type BookingFareValidateResult,
  type BookingHub,
  type BookingLoyaltyOptimizeResult,
  type BookingOffer,
  type BookingPaymentOptimizeResult,
  type BookingProduct,
  type BookingSearchResult,
} from './booking-api';

function OfferCard({
  offer,
  selected,
  onSelect,
  onValidate,
  onOptimizePayment,
  onOptimizeLoyalty,
  busy,
}: {
  offer: BookingOffer;
  selected: boolean;
  onSelect: () => void;
  onValidate: () => void;
  onOptimizePayment: () => void;
  onOptimizeLoyalty?: () => void;
  busy: boolean;
}) {
  return (
    <article
      className={`space-y-3 rounded-2xl border p-5 ${
        selected ? 'border-primary bg-primary/5' : 'border-border/60 bg-background/50'
      }`}
    >
      <button type="button" className="w-full text-left" onClick={onSelect}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Rank #{offer.rank} · {offer.supplierCode}
              {offer.fareFamily ? ` · ${offer.fareFamily}` : ''}
              {offer.flightNumber ? ` · ${offer.flightNumber}` : ''}
              {offer.starRating ? ` · ${offer.starRating}★` : ''}
              {offer.roomType ? ` · ${offer.roomType}` : ''}
            </p>
            <h3 className="font-semibold">{formatOfferTitle(offer.title)}</h3>
            <p className="text-sm text-muted-foreground">{offer.summary}</p>
            {offer.loyaltyProgram ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {offer.loyaltyProgram}
                {offer.estimatedLoyaltyPoints
                  ? ` · ~${offer.estimatedLoyaltyPoints.toLocaleString('en-IN')} pts`
                  : ''}
              </p>
            ) : null}
            {offer.recommendationReason ? (
              <p className="mt-1 text-xs text-primary">{offer.recommendationReason}</p>
            ) : null}
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Effective cost</p>
            <p className="font-display text-2xl font-semibold">
              {formatBookingInr(offer.pricing.effectiveCostInr)}
            </p>
            <p className="text-xs text-muted-foreground">
              Gross {formatBookingInr(offer.pricing.grossPriceInr)}
            </p>
            {offer.rankingScores ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Score {offer.rankingScores.overall.toFixed(0)} · price{' '}
                {offer.rankingScores.price.toFixed(0)} · stay/comfort{' '}
                {offer.rankingScores.convenience.toFixed(0)}
              </p>
            ) : null}
          </div>
        </div>
      </button>

      {offer.recommendedCardName ? (
        <p className="text-sm">
          <span className="text-muted-foreground">Suggested card: </span>
          {offer.recommendedCardName}
        </p>
      ) : null}

      <ul className="space-y-1 text-sm">
        {offer.explanations.slice(0, 3).map((factor) => (
          <li key={factor.code}>
            <span className="font-medium">{factor.label}</span>
            <span className="text-muted-foreground"> — {factor.detail}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={busy} onClick={onValidate}>
          {offer.product === 'HOTEL' ? 'Validate rate' : 'Validate fare'}
        </Button>
        <Button type="button" variant="outline" disabled={busy} onClick={onOptimizePayment}>
          Optimize payment card
        </Button>
        {onOptimizeLoyalty ? (
          <Button type="button" variant="outline" disabled={busy} onClick={onOptimizeLoyalty}>
            Optimize loyalty
          </Button>
        ) : null}
      </div>
    </article>
  );
}

function PortalChannelCard({
  channel,
  onContinue,
  busy,
}: {
  channel: BookingChannelRecommendation;
  onContinue: (channel: BookingChannelRecommendation) => void;
  busy: boolean;
}) {
  return (
    <article className="space-y-3 rounded-2xl border border-border/60 bg-background/50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Rank #{channel.rank} · {channel.bankName}
            {channel.portfolioMatch ? ' · portfolio match' : ''}
          </p>
          <h3 className="font-semibold">{channel.name}</h3>
          <p className="text-sm text-muted-foreground">{channel.accelerationSummary}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Est. effective cost</p>
          <p className="font-display text-2xl font-semibold">
            {formatBookingInr(channel.estimatedEffectiveCostInr)}
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        className="inline-flex items-center gap-2"
        onClick={() => onContinue(channel)}
      >
        Continue on {channel.name}
        <ExternalLink className="size-4" aria-hidden />
      </Button>
    </article>
  );
}

export function BookingHubPage() {
  const flightDates = defaultFlightDates();
  const hotelDates = defaultHotelDates();
  const [product, setProduct] = useState<BookingProduct>('FLIGHT');
  const [hub, setHub] = useState<BookingHub | null>(null);
  const [result, setResult] = useState<BookingSearchResult | null>(null);
  const [channels, setChannels] = useState<BookingChannelRecommendResult | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [validation, setValidation] = useState<BookingFareValidateResult | null>(null);
  const [payment, setPayment] = useState<BookingPaymentOptimizeResult | null>(null);
  const [loyalty, setLoyalty] = useState<BookingLoyaltyOptimizeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const [origin, setOrigin] = useState('BLR');
  const [destination, setDestination] = useState('DEL');
  const [departureDate, setDepartureDate] = useState(flightDates.departureDate);
  const [returnDate, setReturnDate] = useState(flightDates.returnDate);
  const [roundTrip, setRoundTrip] = useState(false);
  const [cabinClass, setCabinClass] = useState<BookingCabinClass>('ECONOMY');
  const [adults, setAdults] = useState(1);
  const [maxStops, setMaxStops] = useState<number | ''>('');
  const [flightSortBy, setFlightSortBy] = useState<'BEST' | 'EFFECTIVE_COST' | 'DURATION'>('BEST');

  const [hotelDestination, setHotelDestination] = useState('GOA');
  const [checkInDate, setCheckInDate] = useState(hotelDates.checkInDate);
  const [checkOutDate, setCheckOutDate] = useState(hotelDates.checkOutDate);
  const [guests, setGuests] = useState(2);
  const [rooms, setRooms] = useState(1);
  const [minStarRating, setMinStarRating] = useState<number | ''>('');
  const [hotelSortBy, setHotelSortBy] = useState<
    'BEST' | 'EFFECTIVE_COST' | 'STAR_RATING' | 'LOYALTY'
  >('BEST');

  useEffect(() => {
    document.title = 'CardOrbit · Booking';
    void getBookingHub()
      .then(setHub)
      .catch((error) => {
        notify.fromError(error, 'Could not load booking hub');
      })
      .finally(() => setLoading(false));
  }, []);

  function clearResults() {
    setValidation(null);
    setPayment(null);
    setLoyalty(null);
    setSelectedOfferId(null);
  }

  async function onSearchFlights(event: FormEvent) {
    event.preventDefault();
    setSearching(true);
    clearResults();
    try {
      const data = await searchFlights({
        origin: origin.trim().toUpperCase(),
        destination: destination.trim().toUpperCase(),
        departureDate,
        returnDate: roundTrip ? returnDate : null,
        tripType: roundTrip ? 'ROUND_TRIP' : 'ONE_WAY',
        passengers: { adults, children: 0, infants: 0 },
        cabinClass,
        maxStops: maxStops === '' ? undefined : maxStops,
        sortBy: flightSortBy,
      });
      setResult(data);
      const bestEffective = data.offers[0]?.pricing.effectiveCostInr;
      const bestGross = data.offers[0]?.pricing.grossPriceInr;
      const channelResult = await recommendBookingChannels({
        product: 'FLIGHT',
        origin: origin.trim().toUpperCase(),
        destination: destination.trim().toUpperCase(),
        departureDate,
        returnDate: roundTrip ? returnDate : null,
        estimatedGrossInr: bestGross,
        directEffectiveCostInr: bestEffective,
      });
      setChannels(channelResult);
    } catch (error) {
      notify.fromError(error, 'Flight search failed');
    } finally {
      setSearching(false);
    }
  }

  async function onSearchHotels(event: FormEvent) {
    event.preventDefault();
    setSearching(true);
    clearResults();
    try {
      const data = await searchHotels({
        destination: hotelDestination.trim().toUpperCase(),
        checkInDate,
        checkOutDate,
        guests,
        rooms,
        minStarRating: minStarRating === '' ? undefined : minStarRating,
        sortBy: hotelSortBy,
      });
      setResult(data);
      const bestEffective = data.offers[0]?.pricing.effectiveCostInr;
      const bestGross = data.offers[0]?.pricing.grossPriceInr;
      const channelResult = await recommendBookingChannels({
        product: 'HOTEL',
        destination: hotelDestination.trim().toUpperCase(),
        checkInDate,
        checkOutDate,
        estimatedGrossInr: bestGross,
        directEffectiveCostInr: bestEffective,
      });
      setChannels(channelResult);
    } catch (error) {
      notify.fromError(error, 'Hotel search failed');
    } finally {
      setSearching(false);
    }
  }

  async function onValidate(offer: BookingOffer) {
    if (!result) return;
    setActionBusy(true);
    setSelectedOfferId(offer.id);
    try {
      const data =
        offer.product === 'HOTEL'
          ? await validateHotelRate({
              offerId: offer.id,
              searchId: result.searchId,
              grossPriceInr: offer.pricing.grossPriceInr,
            })
          : await validateFlightFare({
              offerId: offer.id,
              searchId: result.searchId,
              grossPriceInr: offer.pricing.grossPriceInr,
            });
      setValidation(data);
      toast.message(data.detail);
    } catch (error) {
      notify.fromError(error, 'Validation failed');
    } finally {
      setActionBusy(false);
    }
  }

  async function onOptimizePayment(offer: BookingOffer) {
    setActionBusy(true);
    setSelectedOfferId(offer.id);
    try {
      const data = await optimizeBookingPayment({
        offerId: offer.id,
        product: offer.product,
        grossPriceInr: offer.pricing.grossPriceInr,
      });
      setPayment(data);
      if (data.recommendedCardName) {
        toast.message(`Best card: ${data.recommendedCardName}`);
      }
    } catch (error) {
      notify.fromError(error, 'Payment optimize failed');
    } finally {
      setActionBusy(false);
    }
  }

  async function onOptimizeLoyalty(offer: BookingOffer) {
    if (!result) return;
    setActionBusy(true);
    setSelectedOfferId(offer.id);
    try {
      const data = await optimizeHotelLoyalty({
        offerId: offer.id,
        searchId: result.searchId,
        grossPriceInr: offer.pricing.grossPriceInr,
        loyaltyProgram: offer.loyaltyProgram ?? undefined,
        estimatedLoyaltyPoints: offer.estimatedLoyaltyPoints ?? undefined,
        chainCode: offer.chainCode ?? undefined,
      });
      setLoyalty(data);
      if (data.recommendedLabel) {
        toast.message(`Best loyalty path: ${data.recommendedLabel}`);
      }
    } catch (error) {
      notify.fromError(error, 'Loyalty optimize failed');
    } finally {
      setActionBusy(false);
    }
  }

  async function onPortalContinue(channel: BookingChannelRecommendation) {
    setActionBusy(true);
    try {
      const handoff = await recordPortalHandoff({
        channelId: channel.channelId,
        slug: channel.slug,
        product: channel.product,
        deepLinkUrl: channel.deepLinkUrl,
      });
      window.open(handoff.deepLinkUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      notify.fromError(error, 'Could not open bank portal');
    } finally {
      setActionBusy(false);
    }
  }

  const portalChannels =
    channels?.channels.filter((channel) => channel.kind === 'PORTAL_HANDOFF') ?? [];

  return (
    <div className="space-y-8">
      <PageBackLink to="/account/travel" label="Travel hub" />

      <header className="flex items-start gap-3">
        <span className="rounded-xl bg-primary/10 p-2 text-primary" aria-hidden>
          {product === 'HOTEL' ? <Building2 className="size-5" /> : <Plane className="size-5" />}
        </span>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Travel booking
          </p>
          <h1 className="consumer-page-heading font-display text-2xl font-semibold tracking-tight">
            Multi-supplier search with rewards optimization
          </h1>
          <p className="text-sm text-muted-foreground">
            Compare CardOrbit flight and hotel inventory with bank portals — validate rates, pick a
            card, and choose the best loyalty path.
          </p>
        </div>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading booking hub…</p>
      ) : hub ? (
        <section className="space-y-3 rounded-2xl border border-border/60 bg-background/50 p-5">
          <h2 className="font-semibold">Platform status</h2>
          <p className="text-sm text-muted-foreground">
            Suppliers: {hub.suppliers.map((s) => `${s.name} (${s.status})`).join(', ')}
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {hub.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          <Link
            to="/account/travel/planner"
            className="inline-flex text-sm font-medium text-primary hover:underline"
          >
            Open trip planner →
          </Link>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={product === 'FLIGHT' ? 'default' : 'outline'}
          onClick={() => {
            setProduct('FLIGHT');
            setResult(null);
            setChannels(null);
            clearResults();
          }}
        >
          Flights
        </Button>
        <Button
          type="button"
          variant={product === 'HOTEL' ? 'default' : 'outline'}
          onClick={() => {
            setProduct('HOTEL');
            setResult(null);
            setChannels(null);
            clearResults();
          }}
        >
          Hotels
        </Button>
      </div>

      {product === 'FLIGHT' ? (
        <section className="space-y-4">
          <h2 className="font-semibold">Flight search</h2>
          <form
            onSubmit={onSearchFlights}
            className="grid gap-3 rounded-2xl border border-border/60 bg-background/50 p-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Origin</span>
              <input
                className="w-full rounded-xl border border-border bg-background px-3 py-2"
                value={origin}
                maxLength={3}
                onChange={(e) => setOrigin(e.target.value.toUpperCase())}
                required
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Destination</span>
              <input
                className="w-full rounded-xl border border-border bg-background px-3 py-2"
                value={destination}
                maxLength={3}
                onChange={(e) => setDestination(e.target.value.toUpperCase())}
                required
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Departure</span>
              <input
                type="date"
                className="w-full rounded-xl border border-border bg-background px-3 py-2"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                required
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Return (optional)</span>
              <input
                type="date"
                className="w-full rounded-xl border border-border bg-background px-3 py-2"
                value={returnDate}
                disabled={!roundTrip}
                onChange={(e) => setReturnDate(e.target.value)}
              />
            </label>
            <label className="flex items-center gap-2 text-sm lg:col-span-2">
              <input
                type="checkbox"
                checked={roundTrip}
                onChange={(e) => setRoundTrip(e.target.checked)}
              />
              Round trip
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Cabin</span>
              <select
                className="w-full rounded-xl border border-border bg-background px-3 py-2"
                value={cabinClass}
                onChange={(e) => setCabinClass(e.target.value as BookingCabinClass)}
              >
                <option value="ECONOMY">Economy</option>
                <option value="PREMIUM_ECONOMY">Premium economy</option>
                <option value="BUSINESS">Business</option>
                <option value="FIRST">First</option>
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Adults</span>
              <input
                type="number"
                min={1}
                max={9}
                className="w-full rounded-xl border border-border bg-background px-3 py-2"
                value={adults}
                onChange={(e) => setAdults(Number(e.target.value) || 1)}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Max stops</span>
              <select
                className="w-full rounded-xl border border-border bg-background px-3 py-2"
                value={maxStops === '' ? '' : String(maxStops)}
                onChange={(e) => setMaxStops(e.target.value === '' ? '' : Number(e.target.value))}
              >
                <option value="">Any</option>
                <option value="0">Nonstop</option>
                <option value="1">1 stop</option>
                <option value="2">2 stops</option>
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Sort</span>
              <select
                className="w-full rounded-xl border border-border bg-background px-3 py-2"
                value={flightSortBy}
                onChange={(e) => setFlightSortBy(e.target.value as typeof flightSortBy)}
              >
                <option value="BEST">Best overall</option>
                <option value="EFFECTIVE_COST">Effective cost</option>
                <option value="DURATION">Duration</option>
              </select>
            </label>
            <div className="flex items-end lg:col-span-4">
              <Button type="submit" disabled={searching} className="w-full sm:w-auto">
                {searching ? 'Searching…' : 'Search flights'}
              </Button>
            </div>
          </form>
        </section>
      ) : (
        <section className="space-y-4">
          <h2 className="font-semibold">Hotel search</h2>
          <form
            onSubmit={onSearchHotels}
            className="grid gap-3 rounded-2xl border border-border/60 bg-background/50 p-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Destination</span>
              <input
                className="w-full rounded-xl border border-border bg-background px-3 py-2"
                value={hotelDestination}
                onChange={(e) => setHotelDestination(e.target.value.toUpperCase())}
                required
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Check-in</span>
              <input
                type="date"
                className="w-full rounded-xl border border-border bg-background px-3 py-2"
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                required
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Check-out</span>
              <input
                type="date"
                className="w-full rounded-xl border border-border bg-background px-3 py-2"
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                required
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Guests</span>
              <input
                type="number"
                min={1}
                max={8}
                className="w-full rounded-xl border border-border bg-background px-3 py-2"
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value) || 1)}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Rooms</span>
              <input
                type="number"
                min={1}
                max={4}
                className="w-full rounded-xl border border-border bg-background px-3 py-2"
                value={rooms}
                onChange={(e) => setRooms(Number(e.target.value) || 1)}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Min stars</span>
              <select
                className="w-full rounded-xl border border-border bg-background px-3 py-2"
                value={minStarRating === '' ? '' : String(minStarRating)}
                onChange={(e) =>
                  setMinStarRating(e.target.value === '' ? '' : Number(e.target.value))
                }
              >
                <option value="">Any</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
                <option value="5">5</option>
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Sort</span>
              <select
                className="w-full rounded-xl border border-border bg-background px-3 py-2"
                value={hotelSortBy}
                onChange={(e) => setHotelSortBy(e.target.value as typeof hotelSortBy)}
              >
                <option value="BEST">Best overall</option>
                <option value="EFFECTIVE_COST">Effective cost</option>
                <option value="STAR_RATING">Star rating</option>
                <option value="LOYALTY">Loyalty points</option>
              </select>
            </label>
            <div className="flex items-end lg:col-span-4">
              <Button type="submit" disabled={searching} className="w-full sm:w-auto">
                {searching ? 'Searching…' : 'Search hotels'}
              </Button>
            </div>
          </form>
        </section>
      )}

      {result ? (
        <div className="space-y-8">
          <div className="space-y-4">
            <h3 className="font-semibold">CardOrbit offers</h3>
            <p className="text-sm text-muted-foreground">
              {result.offerCount} offers from {result.suppliersQueried.join(', ')}
            </p>
            <div className="grid gap-4 lg:grid-cols-2">
              {result.offers.map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  selected={selectedOfferId === offer.id}
                  busy={actionBusy}
                  onSelect={() => setSelectedOfferId(offer.id)}
                  onValidate={() => void onValidate(offer)}
                  onOptimizePayment={() => void onOptimizePayment(offer)}
                  onOptimizeLoyalty={
                    offer.product === 'HOTEL' ? () => void onOptimizeLoyalty(offer) : undefined
                  }
                />
              ))}
            </div>
          </div>

          {validation && selectedOfferId === validation.offerId ? (
            <section className="space-y-2 rounded-2xl border border-border/60 bg-background/50 p-5">
              <h3 className="font-semibold">
                {result.product === 'HOTEL' ? 'Rate validation' : 'Fare validation'}
              </h3>
              <p className="text-sm">
                Outcome: <span className="font-medium">{validation.outcome}</span> ·{' '}
                {validation.detail}
              </p>
              <p className="text-sm text-muted-foreground">
                Gross {formatBookingInr(validation.previousGrossInr)} →{' '}
                {formatBookingInr(validation.currentGrossInr)} (Δ{' '}
                {formatBookingInr(validation.priceDeltaInr)}) · effective{' '}
                {formatBookingInr(validation.pricing.effectiveCostInr)}
              </p>
            </section>
          ) : null}

          {payment && payment.cardCount > 0 ? (
            <section className="space-y-3 rounded-2xl border border-border/60 bg-background/50 p-5">
              <h3 className="font-semibold">Pay with</h3>
              <p className="text-sm text-muted-foreground">
                Ranked by effective cost on {formatBookingInr(payment.grossPriceInr)}
              </p>
              <ul className="space-y-2">
                {payment.cards.map((card) => (
                  <li
                    key={card.userCardId}
                    className={`rounded-xl border px-4 py-3 ${
                      card.selected ? 'border-primary bg-primary/5' : 'border-border/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          #{card.rank} {card.cardName}
                        </p>
                        <p className="text-xs text-muted-foreground">{card.bankName}</p>
                      </div>
                      <p className="font-semibold">{formatBookingInr(card.effectiveCostInr)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {loyalty && loyalty.pathCount > 0 ? (
            <section className="space-y-3 rounded-2xl border border-border/60 bg-background/50 p-5">
              <h3 className="font-semibold">Loyalty paths</h3>
              <p className="text-sm text-muted-foreground">
                Compare card earn, chain points, and bank portal acceleration on{' '}
                {formatBookingInr(loyalty.grossPriceInr)}
              </p>
              <ul className="space-y-2">
                {loyalty.paths.map((path) => (
                  <li
                    key={path.path}
                    className={`rounded-xl border px-4 py-3 ${
                      path.selected ? 'border-primary bg-primary/5' : 'border-border/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          #{path.rank} {path.label}
                        </p>
                        <p className="text-xs text-muted-foreground">{path.detail}</p>
                      </div>
                      <p className="font-semibold">
                        {formatBookingInr(path.estimatedEffectiveCostInr)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {channels && portalChannels.length > 0 ? (
            <div className="space-y-4">
              <h3 className="font-semibold">Bank portals — accelerated rewards</h3>
              <p className="text-sm text-muted-foreground">{channels.disclosure}</p>
              <div className="grid gap-4 lg:grid-cols-2">
                {portalChannels.map((channel) => (
                  <PortalChannelCard
                    key={channel.channelId}
                    channel={channel}
                    busy={actionBusy}
                    onContinue={onPortalContinue}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
