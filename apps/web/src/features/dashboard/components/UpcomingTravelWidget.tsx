import { Link } from 'react-router';
import { Plane } from 'lucide-react';

import { formatHomepageInr, type HomepageTravelPreview } from '../dashboard-api';

type Props = {
  travel: HomepageTravelPreview;
};

export function UpcomingTravelWidget({ travel }: Props) {
  if (!travel.hasTravelContext) return null;

  return (
    <section className="space-y-4" aria-labelledby="homepage-travel-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Upcoming travel
          </p>
          <h2
            id="homepage-travel-heading"
            className="font-display text-xl font-semibold tracking-tight"
          >
            Lounges, miles, and travel offers
          </h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/account/travel" className="text-sm font-medium text-primary hover:underline">
            Travel hub →
          </Link>
          <Link
            to="/account/travel/planner"
            className="text-sm font-medium text-primary hover:underline"
          >
            Plan a trip →
          </Link>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
          <div className="mb-2 text-primary" aria-hidden>
            <Plane className="size-4" />
          </div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Lounge cards</p>
          <p className="mt-1 font-display text-2xl font-semibold">{travel.loungeCardCount}</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Miles</p>
          <p className="mt-1 font-display text-2xl font-semibold">
            {Math.round(travel.totalMiles).toLocaleString('en-IN')}
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Miles value</p>
          <p className="mt-1 font-display text-2xl font-semibold">
            {formatHomepageInr(travel.totalMilesValueInr)}
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Travel spend · {travel.periodLabel}
          </p>
          <p className="mt-1 font-display text-2xl font-semibold">
            {formatHomepageInr(travel.recentTravelSpendInr)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {travel.travelOfferCount} travel offer{travel.travelOfferCount === 1 ? '' : 's'}
          </p>
        </div>
      </div>
    </section>
  );
}
