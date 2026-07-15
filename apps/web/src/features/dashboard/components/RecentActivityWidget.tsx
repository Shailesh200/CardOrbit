import { Link } from 'react-router';

import { formatHomepageInr, type HomepageRecentActivityItem } from '../dashboard-api';

type Props = {
  items: HomepageRecentActivityItem[];
};

export function RecentActivityWidget({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-4" aria-labelledby="homepage-activity-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Recent activity
          </p>
          <h2
            id="homepage-activity-heading"
            className="font-display text-xl font-semibold tracking-tight"
          >
            Latest transactions
          </h2>
        </div>
        <Link
          to="/account/transactions"
          className="text-sm font-medium text-primary hover:underline"
        >
          View all →
        </Link>
      </div>
      <ul className="divide-y divide-border/60 rounded-2xl border border-border/60 bg-background/60">
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="font-medium">{item.merchantName}</p>
              <p className="text-xs text-muted-foreground">
                {item.cardName}
                {item.categoryLabel ? ` · ${item.categoryLabel}` : ''}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold">{formatHomepageInr(item.amountInr)}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(item.transactedAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                })}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
