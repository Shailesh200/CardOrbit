import { describe, expect, it } from 'vitest';

import { calculateReward, roundInr } from '../domain/services/reward-calculator';

const baseAt = new Date('2026-06-01T12:00:00.000Z');

describe('roundInr', () => {
  it('rounds to two decimal places', () => {
    expect(roundInr(10.556)).toBe(10.56);
    expect(roundInr(10.554)).toBe(10.55);
  });
});

describe('calculateReward — points multiplier', () => {
  it('calculates base points at 1 point per ₹100', () => {
    const result = calculateReward({
      amountInr: 25000,
      payload: { rewardMultiplier: 3, exclusions: [] },
      pointValueInr: 0.5,
      exclusionTags: [],
      at: baseAt,
    });
    expect(result?.rewardPoints).toBe(750);
    expect(result?.estimatedValueInr).toBe(375);
    expect(result?.effectiveRatePercent).toBe(1.5);
  });

  it('floors partial ₹100 blocks', () => {
    const result = calculateReward({
      amountInr: 25050,
      payload: { rewardMultiplier: 3, exclusions: [] },
      pointValueInr: 0.25,
      exclusionTags: [],
      at: baseAt,
    });
    expect(result?.rewardPoints).toBe(750);
  });

  it.each([
    [1000, 1, 10],
    [5000, 2, 100],
    [10000, 5, 500],
    [9999, 4, 396],
  ])('amount %i multiplier %i => %i points', (amount, multiplier, points) => {
    const result = calculateReward({
      amountInr: amount,
      payload: { rewardMultiplier: multiplier, exclusions: [] },
      pointValueInr: 0.25,
      exclusionTags: [],
      at: baseAt,
    });
    expect(result?.rewardPoints).toBe(points);
  });
});

describe('calculateReward — cashback', () => {
  it('calculates cashback percent', () => {
    const result = calculateReward({
      amountInr: 10000,
      payload: { cashbackPercent: 5, exclusions: [] },
      pointValueInr: 0.25,
      exclusionTags: [],
      at: baseAt,
    });
    expect(result?.cashbackInr).toBe(500);
    expect(result?.estimatedValueInr).toBe(500);
    expect(result?.effectiveRatePercent).toBe(5);
  });

  it.each([
    [1000, 1, 10],
    [2500, 2, 50],
    [10000, 5, 500],
    [3333, 1.5, 50],
  ])('amount %i at %i%% cashback', (amount, percent, cashback) => {
    const result = calculateReward({
      amountInr: amount,
      payload: { cashbackPercent: percent, exclusions: [] },
      pointValueInr: 0.25,
      exclusionTags: [],
      at: baseAt,
    });
    expect(result?.cashbackInr).toBe(cashback);
  });
});

describe('calculateReward — caps', () => {
  it('applies per-transaction cap', () => {
    const result = calculateReward({
      amountInr: 100000,
      payload: { cashbackPercent: 5, perTransactionCap: 500, exclusions: [] },
      pointValueInr: 0.25,
      exclusionTags: [],
      at: baseAt,
    });
    expect(result?.estimatedValueInr).toBe(500);
    expect(result?.capped).toBe(true);
    expect(result?.capAppliedInr).toBe(500);
  });

  it('applies monthly limit cap', () => {
    const result = calculateReward({
      amountInr: 50000,
      payload: { cashbackPercent: 5, monthlyLimit: 1000, exclusions: [] },
      pointValueInr: 0.25,
      exclusionTags: [],
      at: baseAt,
    });
    expect(result?.estimatedValueInr).toBe(1000);
    expect(result?.capped).toBe(true);
  });

  it('applies points cap on INR value', () => {
    const result = calculateReward({
      amountInr: 100000,
      payload: { rewardMultiplier: 10, cap: 2000, exclusions: [] },
      pointValueInr: 0.5,
      exclusionTags: [],
      at: baseAt,
    });
    expect(result?.estimatedValueInr).toBe(2000);
    expect(result?.capped).toBe(true);
  });

  it('does not cap when under limit', () => {
    const result = calculateReward({
      amountInr: 5000,
      payload: { cashbackPercent: 2, cap: 500, exclusions: [] },
      pointValueInr: 0.25,
      exclusionTags: [],
      at: baseAt,
    });
    expect(result?.estimatedValueInr).toBe(100);
    expect(result?.capped).toBe(false);
  });
});

describe('calculateReward — milestone bonus', () => {
  it('adds milestone bonus when threshold met', () => {
    const result = calculateReward({
      amountInr: 15000,
      payload: {
        cashbackPercent: 2,
        spendThreshold: 10000,
        milestoneBonus: 250,
        exclusions: [],
      },
      pointValueInr: 0.25,
      exclusionTags: [],
      at: baseAt,
    });
    expect(result?.milestoneBonusInr).toBe(250);
    expect(result?.estimatedValueInr).toBe(550);
  });

  it('skips milestone when threshold not met', () => {
    const result = calculateReward({
      amountInr: 5000,
      payload: {
        cashbackPercent: 2,
        spendThreshold: 10000,
        milestoneBonus: 250,
        exclusions: [],
      },
      pointValueInr: 0.25,
      exclusionTags: [],
      at: baseAt,
    });
    expect(result?.milestoneBonusInr).toBe(0);
    expect(result?.estimatedValueInr).toBe(100);
  });

  it('allows milestone-only payload', () => {
    const result = calculateReward({
      amountInr: 20000,
      payload: { milestoneBonus: 500, spendThreshold: 15000, exclusions: [] },
      pointValueInr: 0.25,
      exclusionTags: [],
      at: baseAt,
    });
    expect(result?.milestoneBonusInr).toBe(500);
    expect(result?.estimatedValueInr).toBe(500);
  });
});

describe('calculateReward — exclusions', () => {
  it('returns excluded result for fuel tag', () => {
    const result = calculateReward({
      amountInr: 5000,
      payload: { rewardMultiplier: 5, exclusions: ['fuel'] },
      pointValueInr: 0.25,
      exclusionTags: ['fuel'],
      at: baseAt,
    });
    expect(result?.excluded).toBe(true);
    expect(result?.estimatedValueInr).toBe(0);
    expect(result?.explanation).toContain('fuel');
  });

  it.each(['fuel', 'rent', 'wallet', 'utilities'])('excludes %s spend', (tag) => {
    const result = calculateReward({
      amountInr: 5000,
      payload: { cashbackPercent: 5, exclusions: [tag] },
      pointValueInr: 0.25,
      exclusionTags: [tag],
      at: baseAt,
    });
    expect(result?.excluded).toBe(true);
  });

  it('allows spend when exclusion tag not present', () => {
    const result = calculateReward({
      amountInr: 5000,
      payload: { cashbackPercent: 5, exclusions: ['fuel'] },
      pointValueInr: 0.25,
      exclusionTags: ['shopping'],
      at: baseAt,
    });
    expect(result?.excluded).toBe(false);
    expect(result?.estimatedValueInr).toBe(250);
  });
});

describe('calculateReward — validity window', () => {
  it('returns null before validFrom', () => {
    const result = calculateReward({
      amountInr: 5000,
      payload: { cashbackPercent: 5, exclusions: [] },
      pointValueInr: 0.25,
      exclusionTags: [],
      at: new Date('2025-01-01T00:00:00.000Z'),
      validFrom: new Date('2026-01-01T00:00:00.000Z'),
    });
    expect(result).toBeNull();
  });

  it('returns null after validUntil', () => {
    const result = calculateReward({
      amountInr: 5000,
      payload: { cashbackPercent: 5, exclusions: [] },
      pointValueInr: 0.25,
      exclusionTags: [],
      at: new Date('2027-01-01T00:00:00.000Z'),
      validUntil: new Date('2026-12-31T23:59:59.000Z'),
    });
    expect(result).toBeNull();
  });

  it('calculates within validity window', () => {
    const result = calculateReward({
      amountInr: 5000,
      payload: { cashbackPercent: 5, exclusions: [] },
      pointValueInr: 0.25,
      exclusionTags: [],
      at: new Date('2026-06-01T00:00:00.000Z'),
      validFrom: new Date('2026-01-01T00:00:00.000Z'),
      validUntil: new Date('2026-12-31T23:59:59.000Z'),
    });
    expect(result?.estimatedValueInr).toBe(250);
  });
});

describe('calculateReward — combined rewards', () => {
  it('combines points and milestone bonus', () => {
    const result = calculateReward({
      amountInr: 20000,
      payload: {
        rewardMultiplier: 4,
        spendThreshold: 10000,
        milestoneBonus: 100,
        exclusions: [],
      },
      pointValueInr: 0.25,
      exclusionTags: [],
      at: baseAt,
    });
    expect(result?.rewardPoints).toBe(800);
    expect(result?.milestoneBonusInr).toBe(100);
    expect(result?.estimatedValueInr).toBe(300);
  });

  it('uses default point value when zero', () => {
    const result = calculateReward({
      amountInr: 10000,
      payload: { rewardMultiplier: 2, exclusions: [] },
      pointValueInr: 0,
      exclusionTags: [],
      at: baseAt,
    });
    expect(result?.rewardPoints).toBe(200);
    expect(result?.estimatedValueInr).toBe(50);
  });
});

describe('calculateReward — V2 rolling caps and campaigns (M-026)', () => {
  it('applies quarterly period cap with prior rewards consumed', () => {
    const result = calculateReward({
      amountInr: 100000,
      payload: {
        cashbackPercent: 5,
        capPeriod: 'quarterly',
        periodCapInr: 1000,
        exclusions: [],
      },
      pointValueInr: 0.25,
      exclusionTags: [],
      at: baseAt,
      periodRewardsEarnedInr: 800,
    });
    expect(result?.estimatedValueInr).toBe(200);
    expect(result?.capped).toBe(true);
    expect(result?.periodCapRemainingInr).toBe(0);
  });

  it('returns zero when period cap already exhausted', () => {
    const result = calculateReward({
      amountInr: 5000,
      payload: {
        cashbackPercent: 5,
        capPeriod: 'monthly',
        periodCapInr: 500,
        exclusions: [],
      },
      pointValueInr: 0.25,
      exclusionTags: [],
      at: baseAt,
      periodRewardsEarnedInr: 500,
    });
    expect(result?.estimatedValueInr).toBe(0);
    expect(result?.capped).toBe(true);
  });

  it('applies quarterly campaign multiplier boost in active quarter', () => {
    const result = calculateReward({
      amountInr: 10000,
      payload: {
        rewardMultiplier: 3,
        quarterlyCampaign: { multiplierBoost: 2, activeQuarters: [2] },
        exclusions: [],
      },
      pointValueInr: 0.25,
      exclusionTags: [],
      at: new Date('2026-05-15T12:00:00.000Z'),
    });
    expect(result?.rewardPoints).toBe(500);
    expect(result?.campaignApplied).toBe(true);
    expect(result?.benefitsApplied.some((b) => b.includes('Q2 campaign'))).toBe(true);
  });

  it('skips quarterly campaign outside active quarters', () => {
    const result = calculateReward({
      amountInr: 10000,
      payload: {
        rewardMultiplier: 3,
        quarterlyCampaign: { multiplierBoost: 2, activeQuarters: [1] },
        exclusions: [],
      },
      pointValueInr: 0.25,
      exclusionTags: [],
      at: new Date('2026-05-15T12:00:00.000Z'),
    });
    expect(result?.rewardPoints).toBe(300);
    expect(result?.campaignApplied).toBe(false);
  });

  it('awards cumulative milestone when period spend crosses threshold', () => {
    const result = calculateReward({
      amountInr: 5000,
      payload: {
        cashbackPercent: 2,
        spendThreshold: 10000,
        milestoneBonus: 500,
        milestoneMode: 'cumulative',
        milestonePeriod: 'quarterly',
        exclusions: [],
      },
      pointValueInr: 0.25,
      exclusionTags: [],
      at: baseAt,
      periodSpendInr: 8000,
    });
    expect(result?.milestoneBonusInr).toBe(500);
    expect(result?.milestoneCrossed).toBe(true);
    expect(result?.estimatedValueInr).toBe(600);
  });

  it('skips cumulative milestone when threshold already passed', () => {
    const result = calculateReward({
      amountInr: 5000,
      payload: {
        cashbackPercent: 2,
        spendThreshold: 10000,
        milestoneBonus: 500,
        milestoneMode: 'cumulative',
        exclusions: [],
      },
      pointValueInr: 0.25,
      exclusionTags: [],
      at: baseAt,
      periodSpendInr: 12000,
    });
    expect(result?.milestoneBonusInr).toBe(0);
    expect(result?.milestoneCrossed).toBe(false);
  });

  it('includes confidence score and redemption value outputs', () => {
    const result = calculateReward({
      amountInr: 5000,
      payload: { cashbackPercent: 5, exclusions: [] },
      pointValueInr: 0.25,
      exclusionTags: [],
      at: baseAt,
    });
    expect(result?.confidenceScore).toBeGreaterThan(0);
    expect(result?.estimatedRedemptionValueInr).toBe(result?.estimatedValueInr);
  });
});

describe('calculateReward — benefits and explanation', () => {
  it('lists benefits applied', () => {
    const result = calculateReward({
      amountInr: 15000,
      payload: {
        rewardMultiplier: 3,
        spendThreshold: 10000,
        milestoneBonus: 50,
        exclusions: [],
      },
      pointValueInr: 0.25,
      exclusionTags: [],
      at: baseAt,
    });
    expect(result?.benefitsApplied.length).toBeGreaterThan(1);
    expect(result?.explanation).toContain('Estimated reward');
  });
});
