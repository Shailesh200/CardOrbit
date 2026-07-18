import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Gift } from 'lucide-react';

import { PageBackLink } from '@layout/PageBackLink';
import { notify } from '@lib/app-toast';
import {
  formatInr,
  formatPoints,
  getRedemptionCatalog,
  getRedemptionHistory,
  getRedemptionRecommendations,
  type RedemptionCatalogOption,
  type RedemptionHistoryItem,
  type RedemptionRecommendation,
} from './redemptions-api';

function CatalogRow({ item }: { item: RedemptionCatalogOption }) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border/50 px-4 py-3">
      <div className="space-y-1">
        <p className="font-medium">{item.optionLabel}</p>
        <p className="text-sm text-muted-foreground">
          {item.cardName} · {item.bankName}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatPoints(item.balanceKind, item.availablePoints)} available · min{' '}
          {formatPoints(item.balanceKind, item.minPointsRequired)}
        </p>
        {!item.eligible && item.ineligibleReason ? (
          <p className="text-xs text-amber-700 dark:text-amber-300">{item.ineligibleReason}</p>
        ) : null}
      </div>
      <div className="text-right">
        <p className="font-semibold text-primary">{formatInr(item.estimatedValueInr)}</p>
        <p className="text-xs text-muted-foreground">
          {item.effectiveRatePercent.toFixed(2)}% effective · {item.valueMultiplier}x multiplier
        </p>
      </div>
    </li>
  );
}

function RecommendationCard({ item }: { item: RedemptionRecommendation }) {
  return (
    <article className="space-y-2 rounded-2xl border border-border/60 bg-background/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            #{item.priorityRank} recommendation
          </p>
          <p className="font-semibold">{item.optionLabel}</p>
          <p className="text-sm text-muted-foreground">{item.cardName}</p>
        </div>
        <p className="font-semibold text-primary">{formatInr(item.estimatedValueInr)}</p>
      </div>
      <p className="text-sm text-muted-foreground">{item.rationale}</p>
      {item.expiryBoost ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">Expiring balance boost applied</p>
      ) : null}
    </article>
  );
}

function HistoryRow({ item }: { item: RedemptionHistoryItem }) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border/50 px-4 py-3">
      <div className="space-y-1">
        <p className="font-medium">{item.optionLabel}</p>
        <p className="text-sm text-muted-foreground">
          {item.cardName} · {new Date(item.redeemedAt).toLocaleDateString('en-IN')}
        </p>
      </div>
      <div className="text-right">
        <p className="font-semibold text-primary">{formatInr(item.estimatedValueInr)}</p>
        <p className="text-xs text-muted-foreground">
          {formatPoints(item.balanceKind, item.pointsRedeemed)} redeemed
        </p>
      </div>
    </li>
  );
}

export function RedemptionsPage() {
  const [catalog, setCatalog] = useState<RedemptionCatalogOption[]>([]);
  const [recommendations, setRecommendations] = useState<RedemptionRecommendation[]>([]);
  const [summary, setSummary] = useState('');
  const [history, setHistory] = useState<RedemptionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'CardOrbit · Redemptions';
    void Promise.all([
      getRedemptionCatalog(),
      getRedemptionRecommendations(),
      getRedemptionHistory(),
    ])
      .then(([catalogResponse, recommendationsResponse, historyResponse]) => {
        setCatalog(catalogResponse.options.filter((row) => row.eligible));
        setRecommendations(recommendationsResponse.recommendations);
        setSummary(recommendationsResponse.summary);
        setHistory(historyResponse.items);
      })
      .catch((error) => {
        notify.fromError(error, 'Could not load redemptions');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <PageBackLink to="/account/rewards" label="Rewards" />

      <header className="flex items-start gap-3">
        <span className="rounded-xl bg-primary/10 p-2 text-primary" aria-hidden>
          <Gift className="size-5" />
        </span>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Reward redemption
          </p>
          <h1 className="consumer-page-heading font-display text-2xl font-semibold tracking-tight">
            Redemption catalog & value comparison
          </h1>
          <p className="text-sm text-muted-foreground">
            Compare effective INR value across statement credit, travel, gift cards, and partner
            transfers before you redeem.
          </p>
          <Link
            to="/account/rewards"
            className="inline-flex text-sm font-medium text-primary hover:underline"
          >
            Update wallet balances →
          </Link>
        </div>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading redemption options…</p>
      ) : (
        <>
          {summary ? (
            <section className="rounded-2xl border border-border/60 bg-background/50 p-5">
              <h2 className="font-semibold">Recommendation</h2>
              <p className="mt-2 text-sm text-muted-foreground">{summary}</p>
            </section>
          ) : null}

          <section className="space-y-4">
            <h2 className="font-semibold">Top recommendations</h2>
            {recommendations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Add reward balances in your wallet to see redemption recommendations.
              </p>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {recommendations.slice(0, 4).map((item) => (
                  <RecommendationCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="font-semibold">Eligible options</h2>
            {catalog.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No eligible redemption options yet. Sync balances that meet minimum thresholds.
              </p>
            ) : (
              <ul className="space-y-2">
                {catalog.map((item) => (
                  <CatalogRow key={item.id} item={item} />
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="font-semibold">Redemption history</h2>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Recorded redemptions will appear here after you log them via the API.
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
