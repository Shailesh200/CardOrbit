import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { TrendingUp } from 'lucide-react';

import {
  getRewardExpiryIntelligence,
  type RewardExpiryIntelligence,
} from '../../reward-wallet/reward-expiry-api';
import { RewardExpirySummaryBanner } from '../../reward-wallet/RewardExpiryIntelligencePanel';
import {
  formatInr,
  getRewardWalletOverview,
  type RewardWalletOverview,
} from '../../reward-wallet/reward-wallet-api';
import type { HomepageRewardWalletPreview } from '../dashboard-api';

type Props = {
  preview?: HomepageRewardWalletPreview | null;
};

export function RewardWalletSummaryWidget({ preview = null }: Props) {
  const [overview, setOverview] = useState<RewardWalletOverview | null>(null);
  const [expiryIntel, setExpiryIntel] = useState<RewardExpiryIntelligence | null>(null);

  useEffect(() => {
    void Promise.all([getRewardWalletOverview(), getRewardExpiryIntelligence()])
      .then(([wallet, expiry]) => {
        setOverview(wallet);
        setExpiryIntel(expiry);
      })
      .catch(() => {
        setOverview(null);
        setExpiryIntel(null);
      });
  }, []);

  const totalValue = overview?.totalEstimatedValueInr ?? preview?.totalEstimatedValueInr ?? 0;
  const cardCount = overview?.cardCount ?? preview?.cardCount ?? 0;
  const expiringCount = overview?.expiringSoon.length ?? preview?.expiringSoonCount ?? 0;
  const hasValue = totalValue > 0;

  return (
    <section
      className="dashboard-savings flex h-full flex-col justify-between rounded-2xl border border-border/60 bg-background/60 p-5"
      aria-label="Reward wallet summary"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Reward wallet
          </p>
          <p className="font-display text-3xl font-semibold tracking-tight">
            {hasValue ? formatInr(totalValue) : '—'}
          </p>
        </div>
        <span className="rounded-xl bg-primary/10 p-2 text-primary" aria-hidden>
          <TrendingUp className="size-5" />
        </span>
      </div>
      <div className="space-y-2 text-sm text-muted-foreground">
        {expiryIntel && expiryIntel.redeemFirst.length > 0 ? (
          <RewardExpirySummaryBanner intelligence={expiryIntel} />
        ) : null}
        {cardCount > 0 ? (
          <p>
            Tracking {cardCount} card{cardCount === 1 ? '' : 's'}
            {expiringCount > 0
              ? ` · ${expiringCount} balance${expiringCount === 1 ? '' : 's'} expiring soon`
              : ''}
          </p>
        ) : (
          <p>Add cards and enter balances to see your total reward value.</p>
        )}
        <Link to="/account/rewards" className="font-medium text-primary hover:underline">
          Open reward wallet →
        </Link>
      </div>
    </section>
  );
}
