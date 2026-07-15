import { Link } from 'react-router';

import type { HomepageRecommendedAction } from '../dashboard-api';

type Props = {
  actions: HomepageRecommendedAction[];
};

const PRIORITY_LABEL: Record<HomepageRecommendedAction['priority'], string> = {
  high: 'Priority',
  medium: 'Suggested',
  low: 'Optional',
};

export function RecommendedActionsWidget({ actions }: Props) {
  if (actions.length === 0) return null;

  return (
    <section className="space-y-4" aria-labelledby="homepage-actions-heading">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          Recommended actions
        </p>
        <h2
          id="homepage-actions-heading"
          className="font-display text-xl font-semibold tracking-tight"
        >
          What to do next
        </h2>
      </div>
      <ul className="grid gap-3 md:grid-cols-2">
        {actions.map((action) => (
          <li
            key={action.id}
            className="flex flex-col justify-between gap-3 rounded-2xl border border-border/60 bg-background/60 p-4"
          >
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{action.title}</p>
                <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {PRIORITY_LABEL[action.priority]}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{action.body}</p>
            </div>
            <Link
              to={action.actionPath}
              className="text-sm font-medium text-primary hover:underline"
            >
              {action.actionLabel} →
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
