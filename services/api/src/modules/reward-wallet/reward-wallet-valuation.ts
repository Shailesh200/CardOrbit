import { DEFAULT_POINT_VALUE_INR, type RewardBalanceKind } from '@cardwise/validation';

export function estimateBalanceValueInr(
  kind: RewardBalanceKind,
  availableAmount: number,
  pointValueInr: number | null | undefined,
): number {
  if (availableAmount <= 0) return 0;

  if (kind === 'CASHBACK') {
    return roundInr(availableAmount);
  }

  const rate = pointValueInr != null && pointValueInr > 0 ? pointValueInr : DEFAULT_POINT_VALUE_INR;
  return roundInr(availableAmount * rate);
}

export function isExpiringSoon(expiringAt: Date | null, withinDays = 30): boolean {
  if (!expiringAt) return false;
  const cutoff = Date.now() + withinDays * 24 * 60 * 60 * 1000;
  return expiringAt.getTime() <= cutoff;
}

function roundInr(value: number): number {
  return Math.round(value * 100) / 100;
}
