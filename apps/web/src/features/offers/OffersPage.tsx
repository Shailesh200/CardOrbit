import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@cardwise/ui';
import { Tag } from 'lucide-react';

import { EmptyState } from '../../components/feedback/EmptyState';
import { LoadErrorState } from '../../components/feedback/LoadErrorState';
import { CatalogListSkeleton } from '../../components/feedback/PageSkeletons';
import { PageBackLink } from '@layout/PageBackLink';
import { notify } from '@lib/app-toast';

import { formatOfferTitle } from './format-offer-title';
import { listMatchedOffers, type MatchedOffer } from './offers-api';

function OfferCard({ offer }: { offer: MatchedOffer }) {
  return (
    <li>
      <Link
        to={`/account/offers/${offer.slug}`}
        className="block rounded-2xl border border-border/60 bg-background/60 p-5 transition hover:border-primary/40"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              {offer.type === 'BANK' ? 'Bank offer' : 'Merchant offer'}
            </p>
            <h2 className="font-display text-lg font-semibold tracking-tight">
              {formatOfferTitle(offer.title, offer.slug)}
            </h2>
            {offer.merchants.length > 0 ? (
              <p className="text-sm text-muted-foreground">
                {offer.merchants.map((merchant) => merchant.name).join(' · ')}
              </p>
            ) : null}
          </div>
          {offer.cashbackPercent ? (
            <p className="text-sm font-semibold text-primary">
              Up to {offer.cashbackPercent}% back
            </p>
          ) : null}
        </div>

        {offer.description ? (
          <p className="mt-3 text-sm text-muted-foreground">{offer.description}</p>
        ) : null}

        {offer.termsSummary ? (
          <p className="mt-2 text-xs text-muted-foreground">{offer.termsSummary}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          {offer.isEligible ? (
            <span className="rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
              Eligible with your cards
            </span>
          ) : (
            <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
              {offer.ineligibilityReason ?? 'Not eligible yet'}
            </span>
          )}
          {offer.validUntil ? (
            <span className="text-muted-foreground">
              Valid until {new Date(offer.validUntil).toLocaleDateString('en-IN')}
            </span>
          ) : null}
        </div>

        {offer.eligibleCards.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {offer.eligibleCards.slice(0, 4).map((card) => (
              <li
                key={card.creditCardId}
                className="rounded-full border border-border/60 px-2.5 py-1 text-xs"
              >
                {card.cardName}
                {card.userCardId ? ' · in portfolio' : ''}
              </li>
            ))}
          </ul>
        ) : null}
      </Link>
    </li>
  );
}

export function OffersPage() {
  const [status, setStatus] = useState<'active' | 'historical'>('active');
  const [amountInr, setAmountInr] = useState('2500');
  const [offers, setOffers] = useState<MatchedOffer[]>([]);
  const [loadStatus, setLoadStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');

  const load = useCallback(async () => {
    setLoadStatus('loading');
    try {
      const parsedAmount = Number(amountInr);
      const response = await listMatchedOffers({
        status,
        limit: 30,
        amountInr: Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : undefined,
      });
      setOffers(response.items);
      setLoadStatus(response.items.length === 0 ? 'empty' : 'ready');
    } catch (error) {
      setOffers([]);
      setLoadStatus('error');
      notify.fromError(error, 'Could not load offers');
    }
  }, [amountInr, status]);

  useEffect(() => {
    document.title = 'CardOrbit · Offers';
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <PageBackLink to="/account" label="Back to dashboard" />
        <div className="flex flex-wrap items-start gap-3">
          <Tag className="mt-1 size-5 text-primary" aria-hidden />
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Offers</p>
            <h1 className="consumer-page-heading font-display text-[1.75rem] font-semibold tracking-tight">
              Matched for your cards
            </h1>
            <p className="text-sm text-muted-foreground">
              Bank and merchant offers filtered to cards in your portfolio.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label htmlFor="offer-amount" className="text-sm font-medium">
            Sample spend (₹)
          </label>
          <input
            id="offer-amount"
            className="h-10 w-36 rounded-xl border border-border/60 bg-background px-3 text-sm"
            value={amountInr}
            onChange={(event) => setAmountInr(event.target.value)}
          />
        </div>
        <Button type="button" variant="outline" onClick={() => void load()}>
          Recalculate savings
        </Button>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={status === 'active' ? 'default' : 'outline'}
            onClick={() => setStatus('active')}
          >
            Active
          </Button>
          <Button
            type="button"
            size="sm"
            variant={status === 'historical' ? 'default' : 'outline'}
            onClick={() => setStatus('historical')}
          >
            Historical
          </Button>
        </div>
      </div>

      {loadStatus === 'loading' ? (
        <CatalogListSkeleton rows={4} />
      ) : loadStatus === 'error' ? (
        <LoadErrorState title="Could not load offers" onRetry={() => void load()} />
      ) : loadStatus === 'empty' ? (
        <EmptyState
          icon={Tag}
          title={`No ${status} offers yet`}
          description="No offers matched your portfolio. Add cards or check back after new offers are published."
          action={
            <Button asChild size="sm" variant="outline">
              <Link to="/account/cards/add">Add a card</Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4">
          {offers.map((offer) => (
            <OfferCard key={offer.id} offer={offer} />
          ))}
        </ul>
      )}
    </div>
  );
}
