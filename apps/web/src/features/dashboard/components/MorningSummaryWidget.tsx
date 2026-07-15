import { Link } from 'react-router';

import type { HomepageMorningSummary } from '../dashboard-api';

type Props = {
  summary: HomepageMorningSummary;
};

export function MorningSummaryWidget({ summary }: Props) {
  return (
    <section
      className="space-y-4 rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 via-background to-background p-5 sm:p-6"
      aria-labelledby="homepage-morning-heading"
    >
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {summary.timeOfDay === 'morning'
            ? 'Morning summary'
            : summary.timeOfDay === 'afternoon'
              ? 'Afternoon summary'
              : 'Evening summary'}
        </p>
        <p className="text-sm text-muted-foreground">{summary.greeting}</p>
        <h2
          id="homepage-morning-heading"
          className="font-display text-2xl font-semibold tracking-tight sm:text-[1.75rem]"
        >
          {summary.headline}
        </h2>
        <p className="text-sm text-muted-foreground">{summary.supportingLine}</p>
      </div>
      {summary.highlights.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {summary.highlights.map((item) => {
            const body = (
              <>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-1 font-display text-lg font-semibold">{item.value}</p>
                {item.actionPath ? (
                  <p className="mt-1 text-xs font-medium text-primary">View →</p>
                ) : null}
              </>
            );

            return (
              <li key={item.id}>
                {item.actionPath ? (
                  <Link
                    to={item.actionPath}
                    className="block rounded-xl border border-border/50 bg-background/70 px-3 py-3 transition hover:border-primary/40 hover:bg-background"
                  >
                    {body}
                  </Link>
                ) : (
                  <div className="rounded-xl border border-border/50 bg-background/70 px-3 py-3">
                    {body}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
