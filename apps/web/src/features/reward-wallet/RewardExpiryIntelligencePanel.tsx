import { Link } from 'react-router';
import { AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';

import { MiniCreditCard } from '@brand/MiniCreditCard';

import { formatInr, formatRewardAmount, REWARD_BALANCE_KIND_LABELS } from './reward-wallet-api';
import type {
  RedeemFirstItem,
  RewardExpiryIntelligence,
  RewardExpiryItem,
} from './reward-expiry-api';

function ExpiryItemRow({ item }: { item: RewardExpiryItem | RedeemFirstItem }) {
  const isRedeemFirst = 'priorityRank' in item;

  return (
    <li className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/60 px-3 py-3">
      <MiniCreditCard
        bankSlug={item.bankSlug}
        cardSlug={item.cardSlug}
        cardName={item.cardName}
        className="w-[3.25rem] shrink-0"
      />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          {isRedeemFirst ? (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              #{item.priorityRank}
            </span>
          ) : null}
          <p className="font-medium">{item.cardName}</p>
          <span className="text-xs text-muted-foreground">{item.bankName}</span>
        </div>
        <p className="text-sm">
          {formatRewardAmount(item.kind, item.expiringAmount)}{' '}
          <span className="text-muted-foreground">
            {REWARD_BALANCE_KIND_LABELS[item.kind].toLowerCase()}
          </span>
          {' · '}
          <span className="font-medium text-amber-800 dark:text-amber-200">
            {item.daysRemaining} day{item.daysRemaining === 1 ? '' : 's'} left
          </span>
        </p>
        {item.estimatedValueInr != null && item.estimatedValueInr > 0 ? (
          <p className="text-xs text-muted-foreground">
            ≈ {formatInr(item.estimatedValueInr)} value
          </p>
        ) : null}
        {'rationale' in item ? (
          <p className="text-xs text-muted-foreground">{item.rationale}</p>
        ) : null}
      </div>
    </li>
  );
}

export function RewardExpiryIntelligencePanel({
  intelligence,
  compact = false,
}: {
  intelligence: RewardExpiryIntelligence;
  compact?: boolean;
}) {
  if (intelligence.expiringSoon.length === 0) {
    return (
      <section className="rounded-2xl border border-border/60 bg-background/50 p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Sparkles className="size-4" aria-hidden />
          <h2 className="font-semibold text-foreground">Expiry intelligence</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          No rewards expiring in the next 30 days. Update balances when you add expiring amounts.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
        <div className="flex items-start gap-2 text-amber-900 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div className="space-y-1">
            <h2 className="font-semibold">Recommended redemption strategy</h2>
            <p className="text-sm">{intelligence.strategy.summary}</p>
            {intelligence.totalExpiringValueInr > 0 ? (
              <p className="text-xs text-muted-foreground">
                {formatInr(intelligence.totalExpiringValueInr)} total at risk across{' '}
                {intelligence.expiringSoon.length} balance
                {intelligence.expiringSoon.length === 1 ? '' : 's'}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {!compact ? (
        <>
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Redeem first
            </h3>
            <ul className="space-y-2">
              {intelligence.redeemFirst.map((item) => (
                <ExpiryItemRow key={item.balanceId} item={item} />
              ))}
            </ul>
          </section>

          {intelligence.highValue.length > 0 ? (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                High value expiring
              </h3>
              <ul className="space-y-2">
                {intelligence.highValue.map((item) => (
                  <ExpiryItemRow key={`hv-${item.balanceId}`} item={item} />
                ))}
              </ul>
            </section>
          ) : null}

          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Expiring soon
            </h3>
            <ul className="space-y-2">
              {intelligence.expiringSoon.map((item) => (
                <ExpiryItemRow key={`es-${item.balanceId}`} item={item} />
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </section>
  );
}

export function RewardExpirySummaryBanner({
  intelligence,
}: {
  intelligence: RewardExpiryIntelligence;
}) {
  const top = intelligence.redeemFirst[0];
  if (!top) return null;

  return (
    <Link
      to="/account/rewards"
      className="group flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 transition hover:border-amber-500/50"
    >
      <AlertTriangle
        className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300"
        aria-hidden
      />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
          {formatRewardAmount(top.kind, top.expiringAmount)} expiring in {top.daysRemaining} days
        </p>
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {intelligence.strategy.summary}
        </p>
      </div>
      <ArrowRight
        className="size-4 shrink-0 text-amber-700 opacity-70 transition group-hover:translate-x-0.5 dark:text-amber-300"
        aria-hidden
      />
    </Link>
  );
}
