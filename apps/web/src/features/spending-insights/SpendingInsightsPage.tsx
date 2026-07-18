import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { PieChart } from 'lucide-react';

import { PageBackLink } from '@layout/PageBackLink';
import { notify } from '@lib/app-toast';

import {
  DATA_SOURCE_LABELS,
  formatInr,
  getSpendingInsightsOverview,
  type SpendingCategoryBreakdown,
  type SpendingInsightsOverview,
} from './spending-insights-api';

function CategoryBar({ row, maxShare }: { row: SpendingCategoryBreakdown; maxShare: number }) {
  const width = maxShare > 0 ? Math.max(8, (row.sharePercent / maxShare) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">{row.label}</span>
        <span className="text-muted-foreground">{row.sharePercent.toFixed(1)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted/60">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${width}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {formatInr(row.volumeInr)}
        {row.inquiryCount > 0
          ? ` · ${row.inquiryCount} lookup${row.inquiryCount === 1 ? '' : 's'}`
          : ' · estimated'}
      </p>
    </div>
  );
}

export function SpendingInsightsPage() {
  const [overview, setOverview] = useState<SpendingInsightsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'CardOrbit · Spending insights';
    void getSpendingInsightsOverview()
      .then(setOverview)
      .catch((error) => {
        notify.fromError(error, 'Could not load spending insights');
      })
      .finally(() => setLoading(false));
  }, []);

  const maxShare = overview?.categories[0]?.sharePercent ?? 0;

  return (
    <div className="space-y-8">
      <PageBackLink to="/account/reports" label="Reports" />

      <header className="space-y-2">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-primary/10 p-2 text-primary" aria-hidden>
            <PieChart className="size-5" />
          </span>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Spending insights
            </p>
            <h1 className="consumer-page-heading font-display text-2xl font-semibold tracking-tight">
              Where your spend goes
            </h1>
            <p className="text-sm text-muted-foreground">
              Category mix and reward opportunities from imported transactions, reward lookups, and
              onboarding preferences.
            </p>
            <Link
              to="/account/transactions"
              className="inline-flex text-sm font-medium text-primary hover:underline"
            >
              Import or add transactions →
            </Link>
          </div>
        </div>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading insights…</p>
      ) : !overview ? (
        <p className="text-sm text-muted-foreground">
          Spending insights are unavailable right now.
        </p>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            <article className="rounded-2xl border border-border/60 bg-background/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Period
              </p>
              <p className="mt-1 font-semibold">{overview.periodLabel}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {DATA_SOURCE_LABELS[overview.dataSource]}
              </p>
            </article>
            <article className="rounded-2xl border border-border/60 bg-background/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Lookup volume
              </p>
              <p className="mt-1 font-semibold">{formatInr(overview.totalVolumeInr)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {overview.inquiryCount} recommendation
                {overview.inquiryCount === 1 ? '' : 's'}
              </p>
            </article>
            <article className="rounded-2xl border border-border/60 bg-background/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Est. monthly spend
              </p>
              <p className="mt-1 font-semibold">
                {overview.estimatedMonthlySpendInr != null
                  ? formatInr(overview.estimatedMonthlySpendInr)
                  : '—'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">From onboarding spend band</p>
            </article>
          </section>

          <section className="space-y-4 rounded-2xl border border-border/60 bg-background/50 p-5">
            <h2 className="font-semibold">Category breakdown</h2>
            {overview.categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Complete onboarding or search merchants to build your category profile.
              </p>
            ) : (
              <div className="space-y-5">
                {overview.categories.map((row) => (
                  <CategoryBar key={row.slug} row={row} maxShare={maxShare} />
                ))}
              </div>
            )}
          </section>

          {overview.topMerchants.length > 0 ? (
            <section className="space-y-4 rounded-2xl border border-border/60 bg-background/50 p-5">
              <h2 className="font-semibold">Top merchants</h2>
              <ul className="divide-y divide-border/60">
                {overview.topMerchants.map((merchant) => (
                  <li
                    key={merchant.slug ?? merchant.name}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium">{merchant.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {merchant.inquiryCount} lookup{merchant.inquiryCount === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatInr(merchant.volumeInr)}</p>
                      {merchant.slug ? (
                        <Link
                          to={`/account/merchants/${merchant.slug}`}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          View merchant
                        </Link>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="space-y-4">
            <h2 className="font-semibold">Insights</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {overview.insights.map((insight) => (
                <article
                  key={insight.id}
                  className="flex h-full flex-col justify-between rounded-2xl border border-border/60 bg-background/50 p-5"
                >
                  <div className="space-y-2">
                    <h3 className="font-semibold">{insight.title}</h3>
                    <p className="text-sm text-muted-foreground">{insight.body}</p>
                  </div>
                  {insight.actionLabel && insight.actionPath ? (
                    <Link
                      to={insight.actionPath}
                      className="mt-4 inline-flex text-sm font-medium text-primary hover:underline"
                    >
                      {insight.actionLabel} →
                    </Link>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
