import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Button, Input, Label } from '@cardwise/ui';
import { AlertTriangle, Pencil, Wallet } from 'lucide-react';

import { MiniCreditCard } from '@brand/MiniCreditCard';
import { PageBackLink } from '@layout/PageBackLink';
import { notify, toast } from '@lib/app-toast';

import { getRewardExpiryIntelligence, type RewardExpiryIntelligence } from './reward-expiry-api';
import { RewardExpiryIntelligencePanel } from './RewardExpiryIntelligencePanel';
import {
  formatInr,
  formatRewardAmount,
  getRewardWalletOverview,
  REWARD_BALANCE_KIND_LABELS,
  updateRewardWalletCard,
  type RewardBalanceKind,
  type RewardWalletCardSummary,
  type RewardWalletOverview,
} from './reward-wallet-api';

const EDITABLE_KINDS: RewardBalanceKind[] = ['POINTS', 'CASHBACK', 'MILES', 'HOTEL_POINTS'];

type EditState = Record<
  RewardBalanceKind,
  { available: string; expiring: string; expiringAt: string }
>;

function emptyEditState(): EditState {
  return {
    POINTS: { available: '', expiring: '', expiringAt: '' },
    CASHBACK: { available: '', expiring: '', expiringAt: '' },
    MILES: { available: '', expiring: '', expiringAt: '' },
    HOTEL_POINTS: { available: '', expiring: '', expiringAt: '' },
  };
}

function cardToEditState(card: RewardWalletCardSummary): EditState {
  const next = emptyEditState();
  for (const balance of card.balances) {
    next[balance.kind] = {
      available: String(balance.availableAmount),
      expiring: balance.expiringAmount > 0 ? String(balance.expiringAmount) : '',
      expiringAt: balance.expiringAt ? balance.expiringAt.slice(0, 10) : '',
    };
  }
  return next;
}

function CardWalletEditor({
  card,
  onSaved,
}: {
  card: RewardWalletCardSummary;
  onSaved: (updated: RewardWalletCardSummary) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<EditState>(() => cardToEditState(card));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(cardToEditState(card));
  }, [card]);

  async function onSave() {
    setSaving(true);
    try {
      const balances = EDITABLE_KINDS.flatMap((kind) => {
        const row = draft[kind];
        const availableAmount = Number.parseFloat(row.available.replace(/,/g, ''));
        if (!Number.isFinite(availableAmount) || availableAmount < 0) return [];
        const expiringAmount = row.expiring.trim()
          ? Number.parseFloat(row.expiring.replace(/,/g, ''))
          : 0;
        return [
          {
            kind,
            availableAmount,
            expiringAmount: Number.isFinite(expiringAmount) ? expiringAmount : 0,
            expiringAt: row.expiringAt ? `${row.expiringAt}T00:00:00.000Z` : null,
          },
        ];
      });

      if (balances.length === 0) {
        toast.error('Enter at least one balance amount');
        return;
      }

      const updated = await updateRewardWalletCard(card.userCardId, { balances });
      onSaved(updated);
      setOpen(false);
      toast.success('Balances updated');
    } catch (error) {
      notify.fromError(error, 'Could not save balances');
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="rounded-2xl border border-border/60 bg-background/50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <MiniCreditCard
            bankSlug={card.bankSlug}
            cardSlug={card.cardSlug}
            cardName={card.cardName}
            className="w-[4.5rem] shrink-0"
          />
          <div className="min-w-0 space-y-1">
            <h2 className="truncate font-semibold">{card.nickname ?? card.cardName}</h2>
            <p className="text-sm text-muted-foreground">
              {card.bankName}
              {card.rewardProgramName ? ` · ${card.rewardProgramName}` : ''}
            </p>
            <p className="text-lg font-semibold text-primary">
              {formatInr(card.totalEstimatedValueInr)} estimated value
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setOpen((value) => !value)}
        >
          <Pencil className="size-4" />
          {open ? 'Close' : 'Update balances'}
        </Button>
      </div>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {EDITABLE_KINDS.map((kind) => {
          const balance = card.balances.find((row) => row.kind === kind);
          return (
            <li
              key={kind}
              className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2 text-sm"
            >
              <p className="font-medium">{REWARD_BALANCE_KIND_LABELS[kind]}</p>
              <p className="mt-1 tabular-nums">
                {balance && balance.availableAmount > 0
                  ? formatRewardAmount(kind, balance.availableAmount)
                  : '—'}
              </p>
              {balance?.estimatedValueInr != null && balance.availableAmount > 0 ? (
                <p className="text-xs text-muted-foreground">
                  ≈ {formatInr(balance.estimatedValueInr)}
                </p>
              ) : null}
              {balance && balance.expiringAmount > 0 && balance.expiringAt ? (
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                  {formatRewardAmount(kind, balance.expiringAmount)} expiring{' '}
                  {new Date(balance.expiringAt).toLocaleDateString()}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>

      {open ? (
        <div className="mt-5 space-y-4 border-t border-border/50 pt-4">
          <p className="text-sm text-muted-foreground">
            Enter balances from your issuer app or statement. CardOrbit stores them for tracking —
            automatic sync arrives in a later milestone.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {EDITABLE_KINDS.map((kind) => (
              <div key={kind} className="space-y-2 rounded-xl border border-border/50 p-3">
                <Label htmlFor={`${card.userCardId}-${kind}-available`}>
                  {REWARD_BALANCE_KIND_LABELS[kind]}
                </Label>
                <Input
                  id={`${card.userCardId}-${kind}-available`}
                  inputMode="decimal"
                  placeholder="Available balance"
                  value={draft[kind].available}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      [kind]: { ...current[kind], available: event.target.value },
                    }))
                  }
                />
                <Input
                  inputMode="decimal"
                  placeholder="Expiring amount (optional)"
                  value={draft[kind].expiring}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      [kind]: { ...current[kind], expiring: event.target.value },
                    }))
                  }
                />
                <Input
                  type="date"
                  value={draft[kind].expiringAt}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      [kind]: { ...current[kind], expiringAt: event.target.value },
                    }))
                  }
                />
              </div>
            ))}
          </div>
          <Button
            type="button"
            className="btn-premium"
            disabled={saving}
            onClick={() => void onSave()}
          >
            {saving ? 'Saving…' : 'Save balances'}
          </Button>
        </div>
      ) : null}

      {card.lastSyncedAt ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Last updated {new Date(card.lastSyncedAt).toLocaleString()}
        </p>
      ) : null}
    </article>
  );
}

export function RewardWalletPage() {
  const [overview, setOverview] = useState<RewardWalletOverview | null>(null);
  const [expiryIntel, setExpiryIntel] = useState<RewardExpiryIntelligence | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'CardOrbit · Reward wallet';
    Promise.all([getRewardWalletOverview(), getRewardExpiryIntelligence()])
      .then(([wallet, expiry]) => {
        setOverview(wallet);
        setExpiryIntel(expiry);
      })
      .catch((error: Error) => notify.fromError(error))
      .finally(() => setLoading(false));
  }, []);

  function onCardSaved(updated: RewardWalletCardSummary) {
    setOverview((current) => {
      if (!current) return current;
      const cards = current.cards.map((row) =>
        row.userCardId === updated.userCardId ? updated : row,
      );
      const totalEstimatedValueInr = cards.reduce(
        (sum, row) => sum + row.totalEstimatedValueInr,
        0,
      );
      return { ...current, cards, totalEstimatedValueInr };
    });
    void Promise.all([getRewardWalletOverview(), getRewardExpiryIntelligence()])
      .then(([wallet, expiry]) => {
        setOverview(wallet);
        setExpiryIntel(expiry);
      })
      .catch(() => undefined);
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading reward wallet…</p>;
  }

  if (!overview) {
    return <p className="text-sm text-muted-foreground">Reward wallet unavailable.</p>;
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <PageBackLink to="/account" label="Back to dashboard" />
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-primary/10 p-2 text-primary" aria-hidden>
            <Wallet className="size-5" />
          </span>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Reward wallet
            </p>
            <h1 className="consumer-page-heading font-display text-[1.75rem] font-semibold tracking-tight">
              Your rewards at a glance
            </h1>
            <p className="text-sm text-muted-foreground">
              Track points, cashback, miles, and hotel points across every card in your portfolio.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                to="/account/redemptions"
                className="inline-flex text-sm font-medium text-primary hover:underline"
              >
                Compare redemption options →
              </Link>
              <Link
                to="/account/cashback"
                className="inline-flex text-sm font-medium text-primary hover:underline"
              >
                Cashback tracker →
              </Link>
              <Link
                to="/account/milestones"
                className="inline-flex text-sm font-medium text-primary hover:underline"
              >
                Milestones →
              </Link>
            </div>
          </div>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Estimated value</p>
          <p className="mt-1 font-display text-2xl font-semibold">
            {formatInr(overview.totalEstimatedValueInr)}
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Points & miles</p>
          <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
            {overview.totalAvailablePoints.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Cashback</p>
          <p className="mt-1 font-display text-2xl font-semibold">
            {formatInr(overview.totalCashbackInr)}
          </p>
          <Link
            to="/account/cashback"
            className="mt-2 inline-flex text-xs font-medium text-primary hover:underline"
          >
            View cashback tracker →
          </Link>
        </div>
      </section>

      {expiryIntel ? <RewardExpiryIntelligencePanel intelligence={expiryIntel} /> : null}

      {overview.expiringSoon.length > 0 && !expiryIntel ? (
        <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <AlertTriangle className="size-4" aria-hidden />
            <h2 className="font-semibold">Expiring soon</h2>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {overview.expiringSoon.map((item) => (
              <li key={`${item.userCardId}-${item.kind}-${item.expiringAt}`}>
                <span className="font-medium">{item.cardName}</span> —{' '}
                {formatRewardAmount(item.kind, item.expiringAmount)} {item.kind.toLowerCase()} by{' '}
                {new Date(item.expiringAt).toLocaleDateString()}
                {item.estimatedValueInr != null ? ` (≈ ${formatInr(item.estimatedValueInr)})` : ''}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {overview.cards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Add cards to your portfolio to start tracking reward balances.
          </p>
          <Button asChild className="btn-premium mt-4">
            <Link to="/account/cards/add">Add a card</Link>
          </Button>
        </div>
      ) : (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">By card</h2>
          {overview.cards.map((card) => (
            <CardWalletEditor key={card.userCardId} card={card} onSaved={onCardSaved} />
          ))}
        </section>
      )}
    </div>
  );
}
