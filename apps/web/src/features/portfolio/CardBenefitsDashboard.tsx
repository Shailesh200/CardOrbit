import { Link } from 'react-router';
import { ExternalLink, History, Plane, Shield, Sparkles, Tag, Trophy, Wallet } from 'lucide-react';

import { MiniCreditCard } from '@brand/MiniCreditCard';
import { formatOfferTitle } from '@features/offers/format-offer-title';

import {
  formatInr,
  formatRuleRate,
  type CardBenefitItem,
  type CardBenefitsDashboard,
  type CardRewardRuleSummary,
} from './card-benefits-api';

const SECTION_NAV = [
  { id: 'overview', label: 'Overview' },
  { id: 'benefits', label: 'Benefits' },
  { id: 'reward-rules', label: 'Reward rules' },
  { id: 'milestones', label: 'Milestones' },
  { id: 'offers', label: 'Offers' },
  { id: 'lounge', label: 'Lounge' },
  { id: 'insurance', label: 'Insurance' },
  { id: 'annual-fee', label: 'Annual fee' },
  { id: 'history', label: 'History' },
] as const;

function BenefitList({ items, emptyLabel }: { items: CardBenefitItem[]; emptyLabel: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="rounded-xl border border-border/60 bg-background/50 px-4 py-3">
          <p className="font-medium">{item.title}</p>
          {item.description ? (
            <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
          ) : null}
          {item.sourceUrl ? (
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline"
            >
              Source
              <ExternalLink className="size-3" aria-hidden />
            </a>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function RewardRulesList({ rules }: { rules: CardRewardRuleSummary[] }) {
  if (rules.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No active reward rules catalogued for this card yet.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {rules.map((rule) => (
        <li key={rule.id} className="rounded-xl border border-border/60 bg-background/50 px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-medium">{rule.name}</p>
              {rule.spendCategoryCode ? (
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {rule.spendCategoryCode.replaceAll('_', ' ')}
                </p>
              ) : null}
            </div>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              {formatRuleRate(rule)}
            </span>
          </div>
          {rule.capSummary ? (
            <p className="mt-2 text-sm text-muted-foreground">{rule.capSummary}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function SectionHeading({ title, icon: Icon }: { title: string; icon: typeof Sparkles }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-primary" aria-hidden />
      <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
    </div>
  );
}

export function CardBenefitsDashboardView({ dashboard }: { dashboard: CardBenefitsDashboard }) {
  const { overview } = dashboard;

  return (
    <div className="space-y-8">
      <nav className="flex gap-2 overflow-x-auto pb-1 text-sm" aria-label="Card benefits sections">
        {SECTION_NAV.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="shrink-0 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-muted-foreground transition hover:border-primary/40 hover:text-primary"
          >
            {item.label}
          </a>
        ))}
      </nav>

      <section id="overview" className="scroll-mt-24 space-y-4">
        <SectionHeading title="Overview" icon={Sparkles} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Benefits</p>
            <p className="mt-1 text-2xl font-semibold">{overview.benefitCount}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Reward program</p>
            <p className="mt-1 font-semibold">{overview.rewardProgramName ?? '—'}</p>
            {overview.pointValueInr != null ? (
              <p className="text-xs text-muted-foreground">₹{overview.pointValueInr}/point</p>
            ) : null}
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Annual fee</p>
            <p className="mt-1 font-semibold">
              {dashboard.annualFee.annualFeeInr != null
                ? formatInr(dashboard.annualFee.annualFeeInr)
                : '—'}
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Reward wallet</p>
            <p className="mt-1 font-semibold">
              {overview.wallet ? formatInr(overview.wallet.totalEstimatedValueInr) : '—'}
            </p>
            {overview.wallet && overview.wallet.expiringSoonCount > 0 ? (
              <Link
                to="/account/rewards"
                className="text-xs text-amber-700 hover:underline dark:text-amber-300"
              >
                {overview.wallet.expiringSoonCount} balance(s) expiring soon
              </Link>
            ) : (
              <Link to="/account/rewards" className="text-xs text-primary hover:underline">
                Open wallet
              </Link>
            )}
          </div>
        </div>
        {overview.statementDay != null || overview.dueDay != null ? (
          <p className="text-sm text-muted-foreground">
            {overview.statementDay != null ? `Statement day ${overview.statementDay}` : ''}
            {overview.statementDay != null && overview.dueDay != null ? ' · ' : ''}
            {overview.dueDay != null ? `Due day ${overview.dueDay}` : ''}
          </p>
        ) : null}
      </section>

      <section id="benefits" className="scroll-mt-24 space-y-4">
        <SectionHeading title="Benefits" icon={Sparkles} />
        {dashboard.benefitSections.length === 0 ? (
          <p className="text-sm text-muted-foreground">No benefits listed for this card yet.</p>
        ) : (
          dashboard.benefitSections.map((section) => (
            <div key={section.code} className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {section.label}
              </h3>
              <BenefitList items={section.items} emptyLabel="" />
            </div>
          ))
        )}
      </section>

      <section id="reward-rules" className="scroll-mt-24 space-y-4">
        <SectionHeading title="Reward rules" icon={Wallet} />
        <RewardRulesList rules={dashboard.rewardRules} />
      </section>

      <section id="milestones" className="scroll-mt-24 space-y-4">
        <SectionHeading title="Milestones" icon={Trophy} />
        {dashboard.milestones.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No spend milestones detected from reward rules on this card.
          </p>
        ) : (
          <ul className="space-y-2">
            {dashboard.milestones.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-border/60 bg-background/50 px-4 py-3 text-sm"
              >
                <p className="font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">From {item.sourceRuleName}</p>
              </li>
            ))}
            <li>
              <Link
                to="/account/milestones"
                className="text-sm font-medium text-primary hover:underline"
              >
                Open milestone tracker →
              </Link>
            </li>
          </ul>
        )}
      </section>

      <section id="offers" className="scroll-mt-24 space-y-4">
        <SectionHeading title="Offers" icon={Tag} />
        {dashboard.offers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active offers assigned to this card.</p>
        ) : (
          <ul className="space-y-3">
            {dashboard.offers.map((offer) => (
              <li
                key={offer.id}
                className="rounded-xl border border-border/60 bg-background/50 px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-medium">{formatOfferTitle(offer.title, offer.slug)}</p>
                  {offer.cashbackPercent != null ? (
                    <span className="text-xs font-semibold text-primary">
                      {offer.cashbackPercent}% cashback
                    </span>
                  ) : null}
                </div>
                {offer.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">{offer.description}</p>
                ) : null}
                {offer.validUntil ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Valid until {new Date(offer.validUntil).toLocaleDateString()}
                  </p>
                ) : null}
                <Link
                  to="/account/offers"
                  className="mt-2 inline-block text-xs text-primary hover:underline"
                >
                  Browse offers →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="lounge" className="scroll-mt-24 space-y-4">
        <SectionHeading title="Lounge access" icon={Plane} />
        <BenefitList items={dashboard.loungeAccess} emptyLabel="No lounge benefits listed." />
        <Link to="/account/travel" className="text-sm font-medium text-primary hover:underline">
          Open travel hub →
        </Link>
      </section>

      <section id="insurance" className="scroll-mt-24 space-y-4">
        <SectionHeading title="Insurance" icon={Shield} />
        <BenefitList items={dashboard.insurance} emptyLabel="No insurance benefits listed." />
        <Link to="/account/benefits" className="text-sm font-medium text-primary hover:underline">
          Open lifestyle benefits hub →
        </Link>
      </section>

      <section id="annual-fee" className="scroll-mt-24 space-y-4">
        <SectionHeading title="Annual fee" icon={Wallet} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-background/50 p-4 text-sm">
            <p className="text-muted-foreground">Joining fee</p>
            <p className="mt-1 font-semibold">
              {dashboard.annualFee.joiningFeeInr != null
                ? formatInr(dashboard.annualFee.joiningFeeInr)
                : '—'}
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/50 p-4 text-sm">
            <p className="text-muted-foreground">Annual fee</p>
            <p className="mt-1 font-semibold">
              {dashboard.annualFee.annualFeeInr != null
                ? formatInr(dashboard.annualFee.annualFeeInr)
                : '—'}
            </p>
          </div>
        </div>
        {dashboard.annualFee.fees.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {dashboard.annualFee.fees.map((fee) => (
              <li
                key={fee.id}
                className="flex justify-between gap-4 border-b border-border/40 pb-2"
              >
                <span className="text-muted-foreground">{fee.feeType.replaceAll('_', ' ')}</span>
                <span className="font-medium">
                  {fee.amountInr != null ? formatInr(fee.amountInr) : '—'}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {dashboard.annualFee.feeBenefits.length > 0 ? (
          <BenefitList items={dashboard.annualFee.feeBenefits} emptyLabel="" />
        ) : null}
      </section>

      <section id="history" className="scroll-mt-24 space-y-4">
        <SectionHeading title="Historical recommendations" icon={History} />
        {dashboard.recommendationHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No recommendations involving this card yet. Search a merchant to get your first pick.
          </p>
        ) : (
          <ul className="space-y-2">
            {dashboard.recommendationHistory.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/50 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{item.merchantName ?? 'Merchant spend'}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString()} · {formatInr(item.amountInr)}
                  </p>
                </div>
                <div className="text-right">
                  {item.wasRecommended ? (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      Recommended
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">In portfolio</span>
                  )}
                  {item.expectedRewardInr != null ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      ≈ {formatInr(item.expectedRewardInr)}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        <Link
          to="/account/recommendations/history"
          className="text-sm font-medium text-primary hover:underline"
        >
          View all recommendation history →
        </Link>
      </section>
    </div>
  );
}

export function CardBenefitsHero({ dashboard }: { dashboard: CardBenefitsDashboard }) {
  const { overview } = dashboard;
  return (
    <div className="flex min-w-0 items-start gap-4">
      <MiniCreditCard
        bankSlug={overview.bankSlug}
        cardSlug={overview.cardSlug}
        cardName={overview.cardName}
        className="w-[5.5rem] shrink-0"
      />
      <div className="min-w-0 space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {overview.bankName} · {overview.networkName}
        </p>
        <h1 className="consumer-page-heading font-display text-[1.75rem] font-semibold tracking-tight">
          {overview.nickname ?? overview.cardName}
        </h1>
        {overview.nickname ? <p className="text-muted-foreground">{overview.cardName}</p> : null}
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize">
            {overview.status.toLowerCase()}
          </span>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize">
            {overview.tier.toLowerCase().replaceAll('_', ' ')}
          </span>
        </div>
      </div>
    </div>
  );
}
