import { Link } from 'react-router';

import { formatHomepageInr, type HomepageMilestonePreview } from '../dashboard-api';

type Props = {
  milestones: HomepageMilestonePreview[];
};

export function MilestonesPreviewWidget({ milestones }: Props) {
  if (milestones.length === 0) return null;

  return (
    <section className="space-y-4" aria-labelledby="homepage-milestones-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Milestones
          </p>
          <h2
            id="homepage-milestones-heading"
            className="font-display text-xl font-semibold tracking-tight"
          >
            Progress toward fee waivers & bonuses
          </h2>
        </div>
        <Link to="/account/milestones" className="text-sm font-medium text-primary hover:underline">
          View tracker →
        </Link>
      </div>
      <ul className="grid gap-3 md:grid-cols-3">
        {milestones.map((item) => (
          <li key={item.id} className="rounded-2xl border border-border/60 bg-background/60 p-4">
            <p className="font-semibold">{item.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{item.cardName}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, Math.max(0, item.progressPercent))}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {Math.round(item.progressPercent)}% · {formatHomepageInr(item.remainingSpendInr)} left
              · {item.daysRemaining}d
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
