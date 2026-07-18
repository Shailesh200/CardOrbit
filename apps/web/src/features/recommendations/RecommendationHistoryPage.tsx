import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@cardwise/ui';
import { History } from 'lucide-react';

import { PageBackLink } from '@layout/PageBackLink';
import { notify } from '@lib/app-toast';

import {
  listRecommendationHistory,
  type RecommendationHistorySummary,
} from './recommendation-history-api';
import { formatInr } from './recommendations-api';

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function feedbackLabel(type: RecommendationHistorySummary['feedback']) {
  if (!type) return null;
  return type.type === 'USEFUL'
    ? 'Helpful'
    : type.type === 'NOT_USEFUL'
      ? 'Not helpful'
      : 'Feedback sent';
}

export function RecommendationHistoryPage() {
  const [items, setItems] = useState<RecommendationHistorySummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'CardOrbit · Recommendation history';
    listRecommendationHistory(30)
      .then((response) => {
        setItems(response.items);
        setTotal(response.total);
      })
      .catch((error: Error) => notify.fromError(error))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <PageBackLink to="/account/merchants" label="Merchants" />
        <div className="flex flex-wrap items-start gap-3">
          <History className="mt-1 size-5 text-primary" aria-hidden />
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              History
            </p>
            <h1 className="consumer-page-heading font-display text-[1.75rem] font-semibold tracking-tight">
              Recommendation history
            </h1>
            <p className="text-sm text-muted-foreground">
              Past card recommendations for merchants and spend amounts.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading history…</p>
      ) : items.length === 0 ? (
        <div className="consumer-surface rounded-2xl border border-border/60 p-6">
          <p className="text-sm text-muted-foreground">
            No recommendations saved yet. Get a recommendation on a merchant page to build your
            history.
          </p>
          <Button asChild size="sm" variant="outline" className="mt-4">
            <Link to="/account/merchants">Browse merchants</Link>
          </Button>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Showing {items.length} of {total} recommendations
          </p>
          <ul className="grid gap-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="consumer-surface rounded-2xl border border-border/60 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-medium">{item.merchantName ?? 'General spend'}</p>
                    <p className="text-sm text-muted-foreground">{formatWhen(item.createdAt)}</p>
                  </div>
                  {item.expectedRewardInr != null ? (
                    <p className="text-sm font-semibold text-primary">
                      {formatInr(item.expectedRewardInr)} on {formatInr(item.amountInr)}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {formatInr(item.amountInr)} spend
                    </p>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  {item.recommendedCardName ? (
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">
                      {item.recommendedCardName}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">No portfolio match</span>
                  )}
                  {feedbackLabel(item.feedback) ? (
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                      {feedbackLabel(item.feedback)}
                    </span>
                  ) : null}
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs uppercase tracking-wide text-muted-foreground">
                    {item.source.toLowerCase()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
