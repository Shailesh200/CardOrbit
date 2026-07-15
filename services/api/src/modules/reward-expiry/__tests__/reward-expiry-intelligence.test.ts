import { describe, expect, it } from 'vitest';

import {
  buildDedupeKey,
  buildRewardExpiryIntelligence,
  computeUrgencyScore,
  daysUntil,
  formatExpiryNotification,
  resolveAlertWindow,
} from '../reward-expiry-intelligence';

describe('reward expiry intelligence', () => {
  const now = new Date('2026-07-12T00:00:00.000Z');

  const sampleBalance = {
    balanceId: 'bal-1',
    userCardId: 'uc-1',
    cardName: 'HDFC Regalia',
    bankName: 'HDFC Bank',
    bankSlug: 'hdfc',
    cardSlug: 'regalia',
    kind: 'POINTS' as const,
    expiringAmount: 5200,
    expiringAt: new Date('2026-07-24T00:00:00.000Z'),
    estimatedValueInr: 1850,
  };

  it('computes days remaining', () => {
    expect(daysUntil(new Date('2026-07-24T00:00:00.000Z'), now)).toBe(12);
  });

  it('resolves alert windows', () => {
    expect(resolveAlertWindow(25)).toBe(30);
    expect(resolveAlertWindow(12)).toBe(14);
    expect(resolveAlertWindow(7)).toBe(7);
    expect(resolveAlertWindow(1)).toBe(1);
    expect(resolveAlertWindow(45)).toBeNull();
  });

  it('scores urgency by value over days', () => {
    expect(computeUrgencyScore(1850, 12)).toBeCloseTo(154.17, 1);
  });

  it('builds dedupe keys per alert window', () => {
    expect(buildDedupeKey('user-1', 'bal-1', 14)).toBe('reward-expiry:user-1:bal-1:14');
  });

  it('builds intelligence with redeem-first ordering', () => {
    const highValueLater = {
      ...sampleBalance,
      balanceId: 'bal-2',
      expiringAmount: 10000,
      expiringAt: new Date('2026-08-01T00:00:00.000Z'),
      estimatedValueInr: 2500,
    };

    const result = buildRewardExpiryIntelligence([highValueLater, sampleBalance], 0, now);

    expect(result.expiringSoon).toHaveLength(2);
    expect(result.redeemFirst[0]?.balanceId).toBe('bal-1');
    expect(result.strategy.summary).toContain('HDFC Regalia');
    expect(result.totalExpiringValueInr).toBe(4350);
  });

  it('formats notification copy', () => {
    const item = buildRewardExpiryIntelligence([sampleBalance], 0, now).expiringSoon[0]!;
    const notification = formatExpiryNotification(item);
    expect(notification.body).toContain('5,200');
    expect(notification.body).toContain('12 days');
    expect(notification.body).toContain('₹1,850');
  });
});
