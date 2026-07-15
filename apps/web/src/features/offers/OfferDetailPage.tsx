import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Button } from '@cardwise/ui';
import { Tag } from 'lucide-react';

import { PageBackLink } from '@layout/PageBackLink';
import { EmptyState } from '../../components/feedback/EmptyState';
import { AccountRouteSkeleton } from '../../components/feedback/PageSkeletons';
import { toast } from '@lib/app-toast';

import { formatOfferTitle } from './format-offer-title';
import { getOfferDetail, type MatchedOffer } from './offers-api';

export function OfferDetailPage() {
  const { offerSlug = '' } = useParams<{ offerSlug: string }>();
  const [offer, setOffer] = useState<MatchedOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!offerSlug) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await getOfferDetail(offerSlug, 2500);
      if (!result.found) {
        setNotFound(true);
        setOffer(null);
      } else {
        setOffer(result.offer);
        setNotFound(false);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load offer');
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [offerSlug]);

  useEffect(() => {
    document.title = 'CardOrbit · Offer';
    void load();
  }, [load]);

  if (loading) return <AccountRouteSkeleton />;

  if (notFound || !offer) {
    return (
      <div className="space-y-6">
        <PageBackLink to="/account/offers" label="Offers" />
        <EmptyState
          icon={Tag}
          title="Offer not found"
          description="This offer may have expired or is no longer available."
          action={
            <Button asChild size="sm" className="btn-premium">
              <Link to="/account/offers">Browse offers</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageBackLink to="/account/offers" label="Offers" />
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          {offer.type === 'BANK' ? 'Bank offer' : 'Merchant offer'}
        </p>
        <h1 className="consumer-page-heading font-display text-[1.75rem] font-semibold tracking-tight">
          {formatOfferTitle(offer.title, offer.slug)}
        </h1>
        {offer.merchants.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            {offer.merchants.map((merchant) => merchant.name).join(' · ')}
          </p>
        ) : null}
      </header>

      {offer.cashbackPercent ? (
        <p className="text-lg font-semibold text-primary">Up to {offer.cashbackPercent}% back</p>
      ) : null}

      {offer.description ? (
        <p className="text-sm text-muted-foreground">{offer.description}</p>
      ) : null}
      {offer.termsSummary ? (
        <p className="rounded-xl border border-border/60 bg-muted/40 p-4 text-sm text-muted-foreground">
          {offer.termsSummary}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 text-xs">
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
        {offer.bestEstimatedSavingsInr != null ? (
          <span className="font-medium text-primary">
            Est. savings ₹{Math.round(offer.bestEstimatedSavingsInr)}
          </span>
        ) : null}
      </div>

      {offer.eligibleCards.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Eligible cards</h2>
          <ul className="flex flex-wrap gap-2">
            {offer.eligibleCards.map((card) => (
              <li
                key={card.creditCardId}
                className="rounded-full border border-border/60 px-3 py-1.5 text-sm"
              >
                {card.cardName}
                {card.userCardId ? ' · in portfolio' : ''}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Button asChild className="btn-premium">
        <Link to="/account/cards/add">Add an eligible card</Link>
      </Button>
    </div>
  );
}
