import {
  REWARD_BALANCE_KIND_SHORT_LABELS,
  REWARD_EXPIRY_ALERT_WINDOWS,
  type RedeemFirstItem,
  type RedemptionStrategy,
  type RewardExpiryAlertWindow,
  type RewardExpiryIntelligence,
  type RewardExpiryItem,
} from '@cardwise/validation';

export type ExpiryBalanceInput = {
  balanceId: string;
  userCardId: string;
  cardName: string;
  bankName: string;
  bankSlug: string;
  cardSlug: string;
  kind: RewardExpiryItem['kind'];
  expiringAmount: number;
  expiringAt: Date;
  estimatedValueInr: number | null;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function daysUntil(date: Date, now = new Date()): number {
  const diff = date.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / MS_PER_DAY));
}

export function computeUrgencyScore(estimatedValueInr: number, daysRemaining: number): number {
  if (estimatedValueInr <= 0) return 0;
  return Math.round((estimatedValueInr / Math.max(daysRemaining, 1)) * 100) / 100;
}

export function resolveAlertWindow(daysRemaining: number): RewardExpiryAlertWindow | null {
  if (daysRemaining > 30) return null;

  const sorted = [...REWARD_EXPIRY_ALERT_WINDOWS].sort((a, b) => a - b);
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const window = sorted[i]!;
    const lowerBound = i > 0 ? sorted[i - 1]! : 0;
    if (daysRemaining > lowerBound && daysRemaining <= window) {
      return window;
    }
  }

  return 1;
}

export function buildDedupeKey(
  userId: string,
  balanceId: string,
  alertWindow: RewardExpiryAlertWindow,
): string {
  return `reward-expiry:${userId}:${balanceId}:${alertWindow}`;
}

export function buildExpiryItems(
  balances: ExpiryBalanceInput[],
  now = new Date(),
): RewardExpiryItem[] {
  return balances
    .filter((row) => row.expiringAmount > 0 && row.expiringAt.getTime() > now.getTime())
    .map((row) => {
      const daysRemaining = daysUntil(row.expiringAt, now);
      const value = row.estimatedValueInr ?? 0;
      return {
        balanceId: row.balanceId,
        userCardId: row.userCardId,
        cardName: row.cardName,
        bankName: row.bankName,
        bankSlug: row.bankSlug,
        cardSlug: row.cardSlug,
        kind: row.kind,
        expiringAmount: row.expiringAmount,
        expiringAt: row.expiringAt.toISOString(),
        daysRemaining,
        estimatedValueInr: row.estimatedValueInr,
        urgencyScore: computeUrgencyScore(value, daysRemaining),
        alertWindow: resolveAlertWindow(daysRemaining),
      };
    })
    .sort((a, b) => {
      const dateDiff = new Date(a.expiringAt).getTime() - new Date(b.expiringAt).getTime();
      if (dateDiff !== 0) return dateDiff;
      return (b.estimatedValueInr ?? 0) - (a.estimatedValueInr ?? 0);
    });
}

export function pickHighValue(items: RewardExpiryItem[], limit = 5): RewardExpiryItem[] {
  return [...items]
    .sort((a, b) => (b.estimatedValueInr ?? 0) - (a.estimatedValueInr ?? 0))
    .slice(0, limit);
}

export function buildRedeemFirst(items: RewardExpiryItem[], limit = 5): RedeemFirstItem[] {
  return [...items]
    .sort((a, b) => {
      const urgencyDiff = b.urgencyScore - a.urgencyScore;
      if (urgencyDiff !== 0) return urgencyDiff;
      return (b.estimatedValueInr ?? 0) - (a.estimatedValueInr ?? 0);
    })
    .slice(0, limit)
    .map((item, index) => ({
      ...item,
      priorityRank: index + 1,
      rationale: redeemRationale(item),
    }));
}

export function buildRedemptionStrategy(
  expiringSoon: RewardExpiryItem[],
  redeemFirst: RedeemFirstItem[],
): RedemptionStrategy {
  const highValue = pickHighValue(expiringSoon);
  const top = redeemFirst[0];

  if (!top) {
    return {
      summary:
        'No rewards are expiring in the next 30 days. Keep tracking balances in your wallet.',
      redeemFirst: [],
      highValue: [],
    };
  }

  const valueLabel =
    top.estimatedValueInr != null && top.estimatedValueInr > 0
      ? ` (~₹${Math.round(top.estimatedValueInr).toLocaleString('en-IN')} value)`
      : '';

  return {
    summary: `Redeem ${top.cardName} ${REWARD_BALANCE_KIND_SHORT_LABELS[top.kind]} first — ${formatAmount(top.kind, top.expiringAmount)} expire in ${top.daysRemaining} day${top.daysRemaining === 1 ? '' : 's'}${valueLabel}.`,
    redeemFirst,
    highValue,
  };
}

export function buildRewardExpiryIntelligence(
  balances: ExpiryBalanceInput[],
  alertsDelivered = 0,
  now = new Date(),
): RewardExpiryIntelligence {
  const expiringSoon = buildExpiryItems(balances, now).filter((item) => item.daysRemaining <= 30);
  const redeemFirst = buildRedeemFirst(expiringSoon);
  const strategy = buildRedemptionStrategy(expiringSoon, redeemFirst);
  const totalExpiringValueInr = roundInr(
    expiringSoon.reduce((sum, item) => sum + (item.estimatedValueInr ?? 0), 0),
  );

  return {
    expiringSoon,
    highValue: strategy.highValue,
    redeemFirst,
    strategy,
    totalExpiringValueInr,
    alertsDelivered,
  };
}

export function formatExpiryNotification(item: RewardExpiryItem): {
  title: string;
  body: string;
} {
  const amountLabel = formatAmount(item.kind, item.expiringAmount);
  const kindLabel = REWARD_BALANCE_KIND_SHORT_LABELS[item.kind];
  const valueLine =
    item.estimatedValueInr != null && item.estimatedValueInr > 0
      ? `\n\nRedeem now for approximately ₹${Math.round(item.estimatedValueInr).toLocaleString('en-IN')} value.`
      : '';

  return {
    title: `${item.cardName} rewards expiring soon`,
    body: `${amountLabel} ${kindLabel} expire in ${item.daysRemaining} day${item.daysRemaining === 1 ? '' : 's'}.${valueLine}`,
  };
}

function redeemRationale(item: RewardExpiryItem): string {
  const value =
    item.estimatedValueInr != null && item.estimatedValueInr > 0
      ? ` (~₹${Math.round(item.estimatedValueInr).toLocaleString('en-IN')})`
      : '';

  if (item.kind === 'CASHBACK') {
    return `Highest urgency cashback${value} — redeem as statement credit before expiry.`;
  }
  if (item.kind === 'MILES') {
    return `Airline miles${value} expiring soon — transfer or book travel before they lapse.`;
  }
  if (item.kind === 'HOTEL_POINTS') {
    return `Hotel points${value} expiring soon — book a stay or transfer to a partner program.`;
  }
  return `Reward points${value} expiring soon — redeem for vouchers or transfer partners.`;
}

function formatAmount(kind: RewardExpiryItem['kind'], amount: number): string {
  if (kind === 'CASHBACK') {
    return `₹${Math.round(amount).toLocaleString('en-IN')}`;
  }
  return amount.toLocaleString('en-IN');
}

function roundInr(value: number): number {
  return Math.round(value * 100) / 100;
}
