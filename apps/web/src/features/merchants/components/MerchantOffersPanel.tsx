import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@cardwise/ui';

import { toast } from '@lib/app-toast';

import { formatOfferTitle } from '@features/offers/format-offer-title';
import { listMatchedOffers, type MatchedOffer } from '@features/offers/offers-api';

type Props = {
  merchantSlug: string;
  defaultAmountInr?: number;
};

export function MerchantOffersPanel({ merchantSlug, defaultAmountInr = 2500 }: Props) {
  const [offers, setOffers] = useState<MatchedOffer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listMatchedOffers({ merchantSlug, amountInr: defaultAmountInr, limit: 6 })
      .then((response) => setOffers(response.items))
      .catch((error: Error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, [defaultAmountInr, merchantSlug]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading offers…</p>;
  }

  if (offers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No active offers matched this merchant for your portfolio yet.
      </p>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Matched offers</h2>
        <Button asChild size="sm" variant="outline">
          <Link to="/account/offers">View all offers</Link>
        </Button>
      </div>
      <ul className="grid gap-3">
        {offers.map((offer) => (
          <li key={offer.id}>
            <Link
              to={`/account/offers/${offer.slug}`}
              className="block rounded-xl border border-border/60 bg-background/60 p-4 transition hover:border-primary/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-medium">{formatOfferTitle(offer.title, offer.slug)}</p>
                {offer.bestEstimatedSavingsInr != null ? (
                  <p className="text-sm font-semibold text-primary">
                    Est. ₹{Math.round(offer.bestEstimatedSavingsInr)} on ₹{defaultAmountInr}
                  </p>
                ) : null}
              </div>
              {offer.termsSummary ? (
                <p className="mt-1 text-xs text-muted-foreground">{offer.termsSummary}</p>
              ) : null}
              {offer.isEligible ? (
                <p className="mt-2 text-xs text-primary">Eligible with your portfolio</p>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  {offer.ineligibilityReason ?? 'Add an eligible card to use this offer'}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
