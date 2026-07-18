import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Fuel, Shield, Sparkles, UtensilsCrossed, Wallet } from 'lucide-react';

import { PageBackLink } from '@layout/PageBackLink';
import { notify } from '@lib/app-toast';
import {
  formatInr,
  getLifestyleBenefitsOverview,
  type LifestyleBenefitsOverview,
  type LifestyleCardProfile,
} from './lifestyle-benefits-api';

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}

function LifestyleCardPanel({ card }: { card: LifestyleCardProfile }) {
  return (
    <article className="space-y-4 rounded-2xl border border-border/60 bg-background/50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{card.cardName}</p>
          <p className="text-sm text-muted-foreground">
            {card.bankName} · {card.networkName}
          </p>
        </div>
        <Link
          to={`/account/cards/${card.userCardId}`}
          className="text-sm font-medium text-primary hover:underline"
        >
          Card details →
        </Link>
      </div>

      {card.insuranceSummary ? (
        <p className="text-sm">
          <span className="text-muted-foreground">Insurance: </span>
          {card.insuranceSummary}
        </p>
      ) : null}
      {card.fuelSummary ? (
        <p className="text-sm">
          <span className="text-muted-foreground">Fuel: </span>
          {card.fuelSummary}
        </p>
      ) : null}
      {card.diningSummary ? (
        <p className="text-sm">
          <span className="text-muted-foreground">Dining: </span>
          {card.diningSummary}
        </p>
      ) : null}
      {card.emiSummary ? (
        <p className="text-sm">
          <span className="text-muted-foreground">EMI: </span>
          {card.emiSummary}
        </p>
      ) : null}

      {card.lifestyleRewardRules.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Earn rules: {card.lifestyleRewardRules.map((rule) => rule.name).join(', ')}
        </p>
      ) : null}
    </article>
  );
}

function BenefitSection({
  title,
  icon: Icon,
  cards,
  pick,
  renderDetail,
}: {
  title: string;
  icon: typeof Shield;
  cards: LifestyleCardProfile[];
  pick: (card: LifestyleCardProfile) => boolean;
  renderDetail: (card: LifestyleCardProfile) => string | null;
}) {
  const rows = cards.filter(pick);
  if (rows.length === 0) {
    return (
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-primary" aria-hidden />
          <h2 className="font-semibold">{title}</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          No {title.toLowerCase()} benefits found in your portfolio.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-primary" aria-hidden />
        <h2 className="font-semibold">{title}</h2>
      </div>
      <ul className="space-y-2">
        {rows.map((card) => {
          const detail = renderDetail(card);
          return (
            <li key={card.userCardId} className="rounded-xl border border-border/50 px-4 py-3">
              <p className="font-medium">{card.cardName}</p>
              {detail ? <p className="text-sm text-muted-foreground">{detail}</p> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function LifestyleBenefitsPage() {
  const [overview, setOverview] = useState<LifestyleBenefitsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'CardOrbit · Lifestyle benefits';
    void getLifestyleBenefitsOverview()
      .then(setOverview)
      .catch((error) => {
        notify.fromError(error, 'Could not load lifestyle benefits');
      })
      .finally(() => setLoading(false));
  }, []);

  const lifestyleCards =
    overview?.cards.filter(
      (card) =>
        card.insuranceBenefits.length > 0 ||
        card.fuelBenefits.length > 0 ||
        card.diningBenefits.length > 0 ||
        card.emiBenefits.length > 0,
    ) ?? [];

  return (
    <div className="space-y-8">
      <PageBackLink to="/account/cards" label="Cards" />

      <header className="flex items-start gap-3">
        <span className="rounded-xl bg-primary/10 p-2 text-primary" aria-hidden>
          <Sparkles className="size-5" />
        </span>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Lifestyle benefits
          </p>
          <h1 className="consumer-page-heading font-display text-2xl font-semibold tracking-tight">
            Insurance, fuel, dining & EMI across your cards
          </h1>
          <p className="text-sm text-muted-foreground">
            Portfolio-wide view of lifestyle privileges with parsed coverage, surcharge waivers,
            dining discounts, and EMI programs.
          </p>
          <Link
            to="/account/travel"
            className="inline-flex text-sm font-medium text-primary hover:underline"
          >
            Open travel hub →
          </Link>
        </div>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading lifestyle benefits…</p>
      ) : overview ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryCard label="Portfolio cards" value={String(overview.cardCount)} />
            <SummaryCard label="Insurance" value={String(overview.insuranceCardCount)} />
            <SummaryCard label="Fuel" value={String(overview.fuelCardCount)} />
            <SummaryCard label="Dining" value={String(overview.diningCardCount)} />
            <SummaryCard label="EMI" value={String(overview.emiCardCount)} />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border/60 bg-background/50 p-5">
              <h2 className="font-semibold">Fuel spending</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {formatInr(overview.fuelSpending.totalVolumeInr)} across{' '}
                {overview.fuelSpending.transactionCount} transactions (
                {overview.fuelSpending.periodLabel})
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/50 p-5">
              <h2 className="font-semibold">Dining spending</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {formatInr(overview.diningSpending.totalVolumeInr)} across{' '}
                {overview.diningSpending.transactionCount} transactions (
                {overview.diningSpending.periodLabel})
              </p>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <BenefitSection
              title="Insurance"
              icon={Shield}
              cards={overview.cards}
              pick={(card) => card.insuranceBenefits.length > 0}
              renderDetail={(card) => card.insuranceSummary}
            />
            <BenefitSection
              title="Fuel"
              icon={Fuel}
              cards={overview.cards}
              pick={(card) => card.fuelBenefits.length > 0}
              renderDetail={(card) => card.fuelSummary}
            />
            <BenefitSection
              title="Dining"
              icon={UtensilsCrossed}
              cards={overview.cards}
              pick={(card) => card.diningBenefits.length > 0}
              renderDetail={(card) => card.diningSummary}
            />
            <BenefitSection
              title="EMI"
              icon={Wallet}
              cards={overview.cards}
              pick={(card) => card.emiBenefits.length > 0}
              renderDetail={(card) => card.emiSummary}
            />
          </section>

          {lifestyleCards.length > 0 ? (
            <section className="space-y-4">
              <h2 className="font-semibold">Cards with lifestyle benefits</h2>
              <div className="grid gap-4 lg:grid-cols-2">
                {lifestyleCards.map((card) => (
                  <LifestyleCardPanel key={card.userCardId} card={card} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
