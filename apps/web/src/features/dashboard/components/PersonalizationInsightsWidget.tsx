import { Link } from 'react-router';

import { AiBadge } from '../../ai/components/AiBadge';
import { AiVisual } from '../../ai/components/AiVisual';
import type { DashboardInsight } from '../dashboard-api';

type Props = {
  insights: DashboardInsight[];
};

export function PersonalizationInsightsWidget({ insights }: Props) {
  if (insights.length === 0) return null;

  return (
    <section className="space-y-3" aria-labelledby="dashboard-insights-heading">
      <div className="flex items-center gap-2">
        <AiVisual variant="mark" className="size-4" />
        <h2
          id="dashboard-insights-heading"
          className="font-display text-base font-semibold tracking-tight"
        >
          AI insights for you
        </h2>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {insights.map((insight) => (
          <li key={insight.id} className="rounded-2xl border border-border/60 bg-background/60 p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold">{insight.title}</p>
              {insight.source === 'ai' ? <AiBadge variant="insight" /> : null}
            </div>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{insight.body}</p>
            {insight.actionLabel && insight.actionPath ? (
              <Link
                className="consumer-link consumer-link--sm mt-3 inline-block"
                to={insight.actionPath}
              >
                {insight.actionLabel}
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
