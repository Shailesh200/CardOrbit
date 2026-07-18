import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Plane } from 'lucide-react';

import { PageBackLink } from '@layout/PageBackLink';
import { notify } from '@lib/app-toast';
import { formatOfferTitle } from '@features/offers/format-offer-title';
import {
  formatInr,
  getTravelHubOverview,
  type TravelCardProfile,
  type TravelHubOverview,
} from './travel-hub-api';

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}

function TravelCardPanel({ card }: { card: TravelCardProfile }) {
  return (
    <article className="space-y-4 rounded-2xl border border-border/60 bg-background/50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{card.cardName}</p>
          <p className="text-sm text-muted-foreground">
            {card.bankName} · {card.networkName}
          </p>
        </div>
        <Link
          to={`/account/cards/${card.userCardId}`}
          className="text-sm font-medium text-primary hover:underline"
        >
          Card details →
        </Link>
      </div>

      {card.loungeSummary ? (
        <p className="text-sm">
          <span className="text-muted-foreground">Lounge: </span>
          {card.loungeSummary}
        </p>
      ) : null}
      {card.travelSummary ? (
        <p className="text-sm">
          <span className="text-muted-foreground">Travel: </span>
          {card.travelSummary}
        </p>
      ) : null}

      {card.milesBalances.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {card.milesBalances.map((balance) => (
            <li key={balance.kind}>
              {balance.kind === 'MILES' ? 'Miles' : 'Hotel points'}:{' '}
              {balance.availableAmount.toLocaleString('en-IN')}
              {balance.estimatedValueInr != null
                ? ` (~${formatInr(balance.estimatedValueInr)})`
                : ''}
            </li>
          ))}
        </ul>
      ) : null}

      {card.travelRewardRules.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Travel earn rules: {card.travelRewardRules.map((rule) => rule.name).join(', ')}
        </p>
      ) : null}
    </article>
  );
}

export function TravelHubPage() {
  const [overview, setOverview] = useState<TravelHubOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'CardOrbit · Travel';
    void getTravelHubOverview()
      .then(setOverview)
      .catch((error) => {
        notify.fromError(error, 'Could not load travel hub');
      })
      .finally(() => setLoading(false));
  }, []);

  const travelCards =
    overview?.cards.filter(
      (card) =>
        card.loungeBenefits.length > 0 ||
        card.travelBenefits.length > 0 ||
        card.milesBalances.length > 0,
    ) ?? [];

  return (
    <div className="space-y-8">
      <PageBackLink to="/account" label="Account" />

      <header className="flex items-start gap-3">
        <span className="rounded-xl bg-primary/10 p-2 text-primary" aria-hidden>
          <Plane className="size-5" />
        </span>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Travel hub
          </p>
          <h1 className="consumer-page-heading font-display text-2xl font-semibold tracking-tight">
            Travel benefits, lounge & miles
          </h1>
          <p className="text-sm text-muted-foreground">
            Portfolio-wide view of lounge access, travel privileges, miles balances, and travel
            spend — plus card-optimized booking and bank portal channels for accelerated rewards.
          </p>
          <div className="flex flex-col gap-1">
            <Link
              to="/account/travel/booking"
              className="inline-flex text-sm font-medium text-primary hover:underline"
            >
              Compare CardOrbit offers & bank portals (HDFC, Axis, Amex, and more) →
            </Link>
            <Link
              to="/account/travel/planner"
              className="inline-flex text-sm font-medium text-primary hover:underline"
            >
              Plan a trip with card recommendations →
            </Link>
            <Link
              to="/account/redemptions"
              className="inline-flex text-sm font-medium text-primary hover:underline"
            >
              Compare flight & hotel redemptions →
            </Link>
          </div>
        </div>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading travel hub…</p>
      ) : overview ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Portfolio cards" value={String(overview.cardCount)} />
            <SummaryCard label="Lounge cards" value={String(overview.loungeCardCount)} />
            <SummaryCard
              label="Miles & hotel pts"
              value={`${overview.totalMiles.toLocaleString('en-IN')} / ${overview.totalHotelPoints.toLocaleString('en-IN')}`}
            />
            <SummaryCard label="Miles value" value={formatInr(overview.totalMilesValueInr)} />
          </section>

          <section className="rounded-2xl border border-border/60 bg-background/50 p-5">
            <h2 className="font-semibold">Travel spending</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {formatInr(overview.spending.totalVolumeInr)} across{' '}
              {overview.spending.transactionCount} transactions ({overview.spending.periodLabel})
            </p>
            {overview.spending.topMerchants.length > 0 ? (
              <ul className="mt-3 space-y-1 text-sm">
                {overview.spending.topMerchants.map((row) => (
                  <li key={row.merchantName}>
                    {row.merchantName} — {formatInr(row.volumeInr)}
                  </li>
                ))}
              </ul>
            ) : null}
            <Link
              to="/account/transactions"
              className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
            >
              View transactions →
            </Link>
          </section>

          <section className="space-y-4">
            <h2 className="font-semibold">Cards with travel benefits</h2>
            {travelCards.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No travel or lounge benefits detected on your cards yet.
              </p>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {travelCards.map((card) => (
                  <TravelCardPanel key={card.userCardId} card={card} />
                ))}
              </div>
            )}
          </section>

          {overview.travelOffers.length > 0 ? (
            <section className="space-y-4">
              <h2 className="font-semibold">Travel offers</h2>
              <ul className="space-y-2">
                {overview.travelOffers.map((offer) => (
                  <li
                    key={offer.id}
                    className="rounded-xl border border-border/50 px-4 py-3 text-sm"
                  >
                    <p className="font-medium">{formatOfferTitle(offer.title)}</p>
                    <p className="text-muted-foreground">
                      {offer.cardName}
                      {offer.validUntil
                        ? ` · until ${new Date(offer.validUntil).toLocaleDateString('en-IN')}`
                        : ''}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
