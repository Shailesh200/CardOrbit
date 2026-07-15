import { Link } from 'react-router';

import { formatHomepageInr, type HomepageExpiringReward } from '../dashboard-api';

type Props = {
  items: HomepageExpiringReward[];
};

export function ExpiringRewardsWidget({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-4" aria-labelledby="homepage-expiring-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Expiring rewards
          </p>
          <h2
            id="homepage-expiring-heading"
            className="font-display text-xl font-semibold tracking-tight"
          >
            Redeem before they lapse
          </h2>
        </div>
        <Link to="/account/rewards" className="text-sm font-medium text-primary hover:underline">
          Open reward wallet →
        </Link>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <li
            key={`${item.userCardId}-${item.kind}-${item.expiringAt}`}
            className="rounded-2xl border border-border/60 bg-background/60 p-4"
          >
            <p className="font-semibold">{item.cardName}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {item.kind.toLowerCase().replaceAll('_', ' ')} · {item.daysRemaining} day
              {item.daysRemaining === 1 ? '' : 's'} left
            </p>
            <p className="mt-2 font-display text-lg font-semibold">
              {item.estimatedValueInr != null && item.estimatedValueInr > 0
                ? formatHomepageInr(item.estimatedValueInr)
                : item.expiringAmount.toLocaleString('en-IN')}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
