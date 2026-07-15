import { describe, expect, it } from 'vitest';

import {
  computeProgress,
  extractSpendMilestones,
  parseFeeWaiverThreshold,
} from '../milestone-progress';
import { daysRemainingInPeriod, estimateCompletionDate, periodBounds } from '../milestone-period';

describe('milestone progress', () => {
  it('extracts cumulative spend milestones from reward rules', () => {
    const rows = extractSpendMilestones({
      ruleId: 'rule-1',
      ruleName: 'Quarterly bonus',
      payload: {
        spendThreshold: 100000,
        milestoneBonus: 5000,
        milestoneMode: 'cumulative',
        milestonePeriod: 'quarterly',
        exclusions: [],
      },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.spendThreshold).toBe(100000);
    expect(rows[0]?.period).toBe('quarterly');
  });

  it('computes progress and achievement status', () => {
    const progress = computeProgress({ currentSpendInr: 75000, thresholdInr: 100000 });
    expect(progress.progressPercent).toBe(75);
    expect(progress.remainingSpendInr).toBe(25000);
    expect(progress.status).toBe('IN_PROGRESS');
  });

  it('marks milestones as achieved at threshold', () => {
    const progress = computeProgress({ currentSpendInr: 120000, thresholdInr: 100000 });
    expect(progress.status).toBe('ACHIEVED');
    expect(progress.progressPercent).toBe(100);
  });

  it('parses fee waiver thresholds from JSON conditions', () => {
    const parsed = parseFeeWaiverThreshold({
      spendThresholdInr: 200000,
      summary: 'Annual spend waiver',
    });
    expect(parsed.requiredSpendInr).toBe(200000);
    expect(parsed.summary).toBe('Annual spend waiver');
  });

  it('parses fee waiver thresholds from text conditions', () => {
    const parsed = parseFeeWaiverThreshold('Fee waived on ₹2 lakh annual spend');
    expect(parsed.requiredSpendInr).toBe(200000);
  });
});

describe('milestone period helpers', () => {
  it('returns annual calendar bounds', () => {
    const bounds = periodBounds('annual', new Date('2026-06-15T12:00:00.000Z'));
    expect(bounds.label).toBe('Calendar 2026');
    expect(bounds.start.toISOString()).toContain('2026-01-01');
  });

  it('estimates completion date from average spend', () => {
    const start = new Date('2026-01-01T12:00:00.000Z');
    const today = new Date('2026-01-31T12:00:00.000Z');
    const estimated = estimateCompletionDate({
      currentSpendInr: 30000,
      thresholdInr: 100000,
      periodStart: start,
      today,
    });
    expect(estimated).not.toBeNull();
    expect(estimated!.getTime()).toBeGreaterThan(today.getTime());
  });

  it('counts days remaining in period', () => {
    const end = new Date('2026-12-31T12:00:00.000Z');
    const today = new Date('2026-12-01T12:00:00.000Z');
    expect(daysRemainingInPeriod(end, today)).toBe(30);
  });
});
