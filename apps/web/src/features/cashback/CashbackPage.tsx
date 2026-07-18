import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Banknote } from 'lucide-react';

import { PageBackLink } from '@layout/PageBackLink';
import { notify } from '@lib/app-toast';
import {
  CASHBACK_STATUS_LABELS,
  formatInr,
  getCashbackCategories,
  getCashbackDashboard,
  getCashbackForecast,
  getCashbackHistory,
  type CashbackCategoryBreakdown,
  type CashbackDashboard,
  type CashbackForecast,
  type CashbackHistoryItem,
} from './cashback-api';

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}

function HistoryRow({ item }: { item: CashbackHistoryItem }) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border/50 px-4 py-3">
      <div className="space-y-1">
        <p className="font-medium">{item.merchantName}</p>
        <p className="text-sm text-muted-foreground">
          {item.cardName} · {item.categoryLabel}
        </p>
        <p className="text-xs text-muted-foreground">
          {new Date(item.transactedAt).toLocaleDateString('en-IN')} ·{' '}
          {CASHBACK_STATUS_LABELS[item.ledgerStatus]}
          {item.ruleName ? ` · ${item.ruleName}` : ''}
        </p>
      </div>
      <div className="text-right">
        <p className="font-semibold text-primary">{formatInr(item.cashbackInr)}</p>
        <p className="text-xs text-muted-foreground">
          on {formatInr(Math.abs(item.amountInr))}
          {item.cashbackPercent != null ? ` (${item.cashbackPercent}%)` : ''}
        </p>
      </div>
    </li>
  );
}

function CategoryRow({ item }: { item: CashbackCategoryBreakdown }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-border/50 px-4 py-3">
      <div>
        <p className="font-medium">{item.categoryLabel}</p>
        <p className="text-xs text-muted-foreground">
          {item.transactionCount} transaction{item.transactionCount === 1 ? '' : 's'} ·{' '}
          {item.effectiveRatePercent.toFixed(1)}% effective rate
        </p>
      </div>
      <p className="font-semibold text-primary">{formatInr(item.totalCashbackInr)}</p>
    </li>
  );
}

export function CashbackPage() {
  const [dashboard, setDashboard] = useState<CashbackDashboard | null>(null);
  const [history, setHistory] = useState<CashbackHistoryItem[]>([]);
  const [categories, setCategories] = useState<CashbackCategoryBreakdown[]>([]);
  const [forecast, setForecast] = useState<CashbackForecast | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'CardOrbit · Cashback';
    void Promise.all([
      getCashbackDashboard(),
      getCashbackHistory(),
      getCashbackCategories(),
      getCashbackForecast(),
    ])
      .then(([dashboardResponse, historyResponse, categoriesResponse, forecastResponse]) => {
        setDashboard(dashboardResponse);
        setHistory(historyResponse.items);
        setCategories(categoriesResponse.categories);
        setForecast(forecastResponse);
      })
      .catch((error) => {
        notify.fromError(error, 'Could not load cashback data');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <PageBackLink to="/account/rewards" label="Rewards" />

      <header className="flex items-start gap-3">
        <span className="rounded-xl bg-primary/10 p-2 text-primary" aria-hidden>
          <Banknote className="size-5" />
        </span>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Cashback</p>
          <h1 className="consumer-page-heading font-display text-2xl font-semibold tracking-tight">
            Cashback earnings & forecasts
          </h1>
          <p className="text-sm text-muted-foreground">
            Deterministic cashback from your card rules and imported transactions — pending vs
            credited, by category, with monthly projections.
          </p>
          <Link
            to="/account/transactions"
            className="inline-flex text-sm font-medium text-primary hover:underline"
          >
            Import transactions for accurate cashback →
          </Link>
        </div>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading cashback…</p>
      ) : (
        <>
          {dashboard ? (
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard label="Total earned" value={formatInr(dashboard.totalEarnedInr)} />
              <SummaryCard label="Credited" value={formatInr(dashboard.creditedCashbackInr)} />
              <SummaryCard label="Pending" value={formatInr(dashboard.pendingCashbackInr)} />
              <SummaryCard label="This month" value={formatInr(dashboard.monthlyCashbackInr)} />
            </section>
          ) : null}

          {dashboard?.walletCashbackInr != null ? (
            <p className="text-sm text-muted-foreground">
              Wallet cashback balance: {formatInr(dashboard.walletCashbackInr)} (manual sync from
              reward wallet)
            </p>
          ) : null}

          {forecast ? (
            <section className="space-y-3 rounded-2xl border border-border/60 bg-background/50 p-5">
              <h2 className="font-semibold">Monthly forecast</h2>
              <p className="text-sm text-muted-foreground">
                Projected {formatInr(forecast.projectedMonthlyCashbackInr)} this month based on{' '}
                {formatInr(forecast.averageDailyCashbackInr)}/day over the last{' '}
                {forecast.basedOnDays} days.
              </p>
              <p className="text-xs text-muted-foreground">
                {forecast.onTrackVsLastMonth ? 'On pace vs last month' : 'Behind last month pace'} ·
                Last month {formatInr(forecast.lastMonthCashbackInr)} · Current month so far{' '}
                {formatInr(forecast.currentMonthCashbackInr)}
              </p>
            </section>
          ) : null}

          <section className="space-y-4">
            <h2 className="font-semibold">By category</h2>
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No cashback earnings detected yet. Add cashback cards and import transactions.
              </p>
            ) : (
              <ul className="space-y-2">
                {categories.map((item) => (
                  <CategoryRow key={item.categorySlug} item={item} />
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="font-semibold">History</h2>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Cashback history appears when eligible transactions earn cashback.
              </p>
            ) : (
              <ul className="space-y-2">
                {history.map((item) => (
                  <HistoryRow key={item.id} item={item} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
