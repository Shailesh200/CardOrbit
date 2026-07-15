import { describe, expect, it } from 'vitest';

import {
  buildUpcomingBillId,
  computeBillingCycle,
  daysUntil,
  nextOccurrenceOfDay,
  parseUpcomingBillId,
  resolveStatementStatus,
  toBillDisplayStatus,
} from '../billing-dates';

describe('billing dates', () => {
  it('computes a billing cycle from statement and due days', () => {
    const cycle = computeBillingCycle({
      statementDay: 5,
      dueDay: 25,
      referenceDate: new Date('2026-06-15T12:00:00.000Z'),
    });

    expect(cycle.statementDate.toISOString().slice(0, 10)).toBe('2026-06-05');
    expect(cycle.dueDate.toISOString().slice(0, 10)).toBe('2026-06-25');
    expect(cycle.periodEnd.getTime()).toBe(cycle.statementDate.getTime());
  });

  it('finds the next occurrence of a calendar day', () => {
    const next = nextOccurrenceOfDay(20, new Date('2026-06-15T12:00:00.000Z'));
    expect(next.toISOString().slice(0, 10)).toBe('2026-06-20');
  });

  it('marks overdue open statements', () => {
    const status = resolveStatementStatus({
      storedStatus: 'OPEN',
      dueDate: new Date('2026-05-01T12:00:00.000Z'),
      today: new Date('2026-06-15T12:00:00.000Z'),
    });
    expect(status).toBe('OVERDUE');
  });

  it('maps upcoming bills to UPCOMING display status', () => {
    expect(
      toBillDisplayStatus({
        kind: 'upcoming',
        dueDate: new Date('2026-07-01T12:00:00.000Z'),
      }),
    ).toBe('UPCOMING');
  });

  it('round-trips upcoming bill ids', () => {
    const dueDate = new Date('2026-07-25T12:00:00.000Z');
    const id = buildUpcomingBillId('uc-1', dueDate);
    const parsed = parseUpcomingBillId(id);
    expect(parsed?.userCardId).toBe('uc-1');
    expect(parsed?.dueDate.toISOString().slice(0, 10)).toBe('2026-07-25');
  });

  it('calculates whole-day distance until due date', () => {
    expect(
      daysUntil(new Date('2026-06-01T23:00:00.000Z'), new Date('2026-06-03T01:00:00.000Z')),
    ).toBe(2);
  });
});
