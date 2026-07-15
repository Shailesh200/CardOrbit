import { describe, expect, it } from 'vitest';

import { estimateBalanceValueInr, isExpiringSoon } from '../reward-wallet-valuation';

describe('reward wallet valuation', () => {
  it('values cashback 1:1 in INR', () => {
    expect(estimateBalanceValueInr('CASHBACK', 1250, null)).toBe(1250);
  });

  it('values points using program rate', () => {
    expect(estimateBalanceValueInr('POINTS', 10000, 0.3)).toBe(3000);
  });

  it('falls back to default point value', () => {
    expect(estimateBalanceValueInr('MILES', 1000, null)).toBe(250);
  });

  it('detects expiring balances within window', () => {
    const soon = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const later = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    expect(isExpiringSoon(soon, 30)).toBe(true);
    expect(isExpiringSoon(later, 30)).toBe(false);
    expect(isExpiringSoon(null, 30)).toBe(false);
  });
});
