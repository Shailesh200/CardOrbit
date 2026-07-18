import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Trophy } from 'lucide-react';

import { PageBackLink } from '@layout/PageBackLink';
import { notify } from '@lib/app-toast';
import {
  formatInr,
  getAnnualFeeWaiverProgress,
  getMilestoneForecast,
  getSpendMilestones,
  MILESTONE_STATUS_LABELS,
  type AnnualFeeWaiverProgress,
  type MilestoneForecast,
  type SpendMilestoneProgress,
} from './milestones-api';

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted/60">
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}

function MilestoneCard({ item }: { item: SpendMilestoneProgress }) {
  return (
    <article className="space-y-3 rounded-2xl border border-border/60 bg-background/50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="font-semibold">{item.label}</p>
          <p className="text-sm text-muted-foreground">
            {item.cardName} · {item.bankName}
          </p>
          <p className="text-xs text-muted-foreground">
            {item.periodLabel} · {MILESTONE_STATUS_LABELS[item.status]}
          </p>
        </div>
        <p className="text-lg font-semibold text-primary">{item.progressPercent.toFixed(1)}%</p>
      </div>
      <ProgressBar percent={item.progressPercent} />
      <div className="grid gap-2 text-sm sm:grid-cols-3">
        <p>
          <span className="text-muted-foreground">Spent </span>
          {formatInr(item.currentSpendInr)}
        </p>
        <p>
          <span className="text-muted-foreground">Remaining </span>
          {formatInr(item.remainingSpendInr)}
        </p>
        <p>
          <span className="text-muted-foreground">Target </span>
          {formatInr(item.spendThresholdInr)}
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        {item.transactionCount} transaction{item.transactionCount === 1 ? '' : 's'} in period ·{' '}
        {item.daysRemaining} day{item.daysRemaining === 1 ? '' : 's'} left
      </p>
    </article>
  );
}

function FeeWaiverCard({ item }: { item: AnnualFeeWaiverProgress }) {
  return (
    <article className="space-y-3 rounded-2xl border border-border/60 bg-background/50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="font-semibold">{item.cardName}</p>
          <p className="text-sm text-muted-foreground">{item.bankName}</p>
          {item.annualFeeInr != null ? (
            <p className="text-xs text-muted-foreground">
              Annual fee {formatInr(item.annualFeeInr)}
            </p>
          ) : null}
        </div>
        <p className="text-lg font-semibold text-primary">{item.progressPercent.toFixed(1)}%</p>
      </div>
      <ProgressBar percent={item.progressPercent} />
      <p className="text-sm text-muted-foreground">
        {formatInr(item.currentSpendInr)} of {formatInr(item.requiredSpendInr)} required ·{' '}
        {item.daysRemaining} days left in {item.periodLabel.toLowerCase()}
      </p>
      {item.waiverSummary ? (
        <p className="text-xs text-muted-foreground">{item.waiverSummary}</p>
      ) : null}
    </article>
  );
}

export function MilestoneTrackerPage() {
  const [milestones, setMilestones] = useState<SpendMilestoneProgress[]>([]);
  const [feeWaivers, setFeeWaivers] = useState<AnnualFeeWaiverProgress[]>([]);
  const [forecasts, setForecasts] = useState<MilestoneForecast[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'CardOrbit · Milestones';
    void Promise.all([getSpendMilestones(), getAnnualFeeWaiverProgress(), getMilestoneForecast()])
      .then(([milestoneResponse, waiverResponse, forecastResponse]) => {
        setMilestones(milestoneResponse.spendMilestones);
        setFeeWaivers(waiverResponse.items);
        setForecasts(forecastResponse.forecasts);
      })
      .catch((error) => {
        notify.fromError(error, 'Could not load milestones');
      })
      .finally(() => setLoading(false));
  }, []);

  const forecastById = new Map(forecasts.map((row) => [row.milestoneId, row]));

  return (
    <div className="space-y-8">
      <PageBackLink to="/account/rewards" label="Rewards" />

      <header className="flex items-start gap-3">
        <span className="rounded-xl bg-primary/10 p-2 text-primary" aria-hidden>
          <Trophy className="size-5" />
        </span>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Milestone tracker
          </p>
          <h1 className="consumer-page-heading font-display text-2xl font-semibold tracking-tight">
            Spend milestones & fee waivers
          </h1>
          <p className="text-sm text-muted-foreground">
            Progress is calculated from imported transactions and reward rule thresholds on your
            cards.
          </p>
          <Link
            to="/account/transactions"
            className="inline-flex text-sm font-medium text-primary hover:underline"
          >
            Import transactions for accurate tracking →
          </Link>
        </div>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading milestones…</p>
      ) : (
        <>
          <section className="space-y-4">
            <h2 className="font-semibold">Annual fee waiver</h2>
            {feeWaivers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No fee waiver thresholds found on your portfolio cards yet.
              </p>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {feeWaivers.map((item) => (
                  <FeeWaiverCard key={item.userCardId} item={item} />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="font-semibold">Spend milestones</h2>
            {milestones.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No spend milestones detected from your card reward rules.
              </p>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {milestones.map((item) => (
                  <div key={item.id} className="space-y-2">
                    <MilestoneCard item={item} />
                    {forecastById.get(item.id) ? (
                      <p className="px-1 text-xs text-muted-foreground">
                        {forecastById.get(item.id)!.estimatedCompletionDate
                          ? forecastById.get(item.id)!.onTrack
                            ? `On track — est. completion ${new Date(forecastById.get(item.id)!.estimatedCompletionDate!).toLocaleDateString('en-IN')}`
                            : 'Behind pace for this period based on current spend rate'
                          : 'Add transactions to unlock completion forecast'}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
