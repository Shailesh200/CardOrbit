import { Link } from 'react-router';
import { Button } from '@cardwise/ui';

import type { DashboardOfferPreview } from '../dashboard-api';
import { formatOfferTitle } from '../../offers/format-offer-title';

type Props = {
  offers: DashboardOfferPreview[];
};

export function OffersPreviewWidget({ offers }: Props) {
  if (offers.length === 0) return null;

  return (
    <section className="space-y-4" aria-labelledby="dashboard-offers-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Offers</p>
          <h2
            id="dashboard-offers-heading"
            className="font-display text-xl font-semibold tracking-tight"
          >
            Matched for your cards
          </h2>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/account/offers">View all</Link>
        </Button>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {offers.map((offer) => (
          <li key={offer.id}>
            <Link
              to={`/account/offers/${offer.slug}`}
              className="block rounded-2xl border border-border/60 bg-background/60 p-4 transition hover:border-primary/40"
            >
              <p className="font-medium">{formatOfferTitle(offer.title, offer.slug)}</p>
              {offer.merchantName ? (
                <p className="mt-1 text-xs text-muted-foreground">{offer.merchantName}</p>
              ) : null}
              {offer.cashbackPercent ? (
                <p className="mt-1 text-sm font-semibold text-primary">
                  Up to {offer.cashbackPercent}% cashback
                </p>
              ) : null}
              {offer.bestEstimatedSavingsInr != null ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Est. savings ₹{Math.round(offer.bestEstimatedSavingsInr)} on sample spend
                </p>
              ) : null}
              {offer.description ? (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                  {offer.description}
                </p>
              ) : null}
              {!offer.isEligible ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Add an eligible card to activate
                </p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
