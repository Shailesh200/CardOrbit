import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Crown, TrendingUp } from 'lucide-react';

import { PageBackLink } from '@layout/PageBackLink';
import { notify } from '@lib/app-toast';
import {
  formatInr,
  getPremiumDashboardOverview,
  type PremiumCardRoi,
  type PremiumDashboardOverview,
  type PremiumRecommendation,
} from './premium-dashboard-api';

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}

function RoiCard({ card }: { card: PremiumCardRoi }) {
  const positive = card.netRoiInr >= 0;
  return (
    <article className="space-y-3 rounded-2xl border border-border/60 bg-background/50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{card.cardName}</p>
          <p className="text-sm text-muted-foreground">
            {card.bankName} · {card.tier.replaceAll('_', ' ')}
          </p>
        </div>
        <Link
          to={`/account/cards/${card.userCardId}`}
          className="text-sm font-medium text-primary hover:underline"
        >
          Card details →
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs text-muted-foreground">Net ROI</p>
          <p
            className={`font-semibold ${positive ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}
          >
            {formatInr(card.netRoiInr)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Reward efficiency</p>
          <p className="font-semibold">{card.rewardEfficiencyPercent.toFixed(2)}%</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Annual fee</p>
          <p className="font-semibold">
            {card.annualFeeInr != null ? formatInr(card.annualFeeInr) : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Wallet value</p>
          <p className="font-semibold">{formatInr(card.walletValueInr)}</p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Benefits est. {formatInr(card.estimatedBenefitsValueInr)} · Spend{' '}
        {formatInr(card.spendVolumeInr)} · {card.benefitCount} lifestyle perks
      </p>

      {card.feeWaiverProgressPercent != null ? (
        <p className="text-xs text-primary">
          Fee waiver progress: {card.feeWaiverProgressPercent.toFixed(0)}%
        </p>
      ) : null}
    </article>
  );
}

function RecommendationCard({ item }: { item: PremiumRecommendation }) {
  return (
    <article className="rounded-xl border border-border/50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">{item.kind}</p>
      <p className="font-medium">{item.title}</p>
      <p className="text-sm text-muted-foreground">{item.description}</p>
    </article>
  );
}

export function PremiumDashboardPage() {
  const [overview, setOverview] = useState<PremiumDashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'CardOrbit · Premium dashboard';
    void getPremiumDashboardOverview()
      .then(setOverview)
      .catch((error) => {
        notify.fromError(error, 'Could not load premium dashboard');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <PageBackLink to="/account/cards" label="Cards" />

      <header className="flex items-start gap-3">
        <span className="rounded-xl bg-primary/10 p-2 text-primary" aria-hidden>
          <Crown className="size-5" />
        </span>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Premium dashboard
          </p>
          <h1 className="consumer-page-heading font-display text-2xl font-semibold tracking-tight">
            Premium card ROI & reward efficiency
          </h1>
          <p className="text-sm text-muted-foreground">
            Annual savings, fee vs benefits, milestone upside, and usage recommendations for
            premium-tier cards — intelligence-first, not paywalled.
          </p>
          <div className="flex flex-col gap-1">
            <Link
              to="/account/cards/compare"
              className="inline-flex text-sm font-medium text-primary hover:underline"
            >
              Compare cards side by side →
            </Link>
            <Link
              to="/account/milestones"
              className="inline-flex text-sm font-medium text-primary hover:underline"
            >
              Track milestones & fee waivers →
            </Link>
          </div>
        </div>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading premium dashboard…</p>
      ) : overview ? (
        <>
          <section className="rounded-2xl border border-border/60 bg-background/50 p-5">
            <div className="flex items-start gap-2">
              <TrendingUp className="mt-0.5 size-4 text-primary" aria-hidden />
              <p className="text-sm text-muted-foreground">{overview.summary}</p>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{overview.periodLabel}</p>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Premium cards" value={String(overview.premiumCardCount)} />
            <SummaryCard label="Portfolio net ROI" value={formatInr(overview.portfolioNetRoiInr)} />
            <SummaryCard label="Annual fees" value={formatInr(overview.totalAnnualFeesInr)} />
            <SummaryCard
              label="Avg efficiency"
              value={`${overview.averageRewardEfficiencyPercent.toFixed(2)}%`}
            />
          </section>

          {overview.recommendations.length > 0 ? (
            <section className="space-y-3">
              <h2 className="font-semibold">Premium recommendations</h2>
              <ul className="space-y-3">
                {overview.recommendations.map((item) => (
                  <li key={`${item.kind}-${item.priorityRank}`}>
                    <RecommendationCard item={item} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {overview.cards.length > 0 ? (
            <section className="space-y-4">
              <h2 className="font-semibold">Premium card ROI</h2>
              <div className="grid gap-4 lg:grid-cols-2">
                {overview.cards.map((card) => (
                  <RoiCard key={card.userCardId} card={card} />
                ))}
              </div>
            </section>
          ) : (
            <p className="text-sm text-muted-foreground">
              No premium-tier cards in your portfolio yet. Cards with premium tier or annual fee ≥
              ₹5,000 appear here automatically.
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}
