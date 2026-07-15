import { describe, expect, it } from 'vitest';

import {
  bucketEventsByDay,
  countEventsByType,
  eventsInRange,
  filterEventsByType,
  mapBillDueEvents,
  mapMilestoneEndEvents,
  mapOfferExpiryEvents,
  mapRewardExpiryEvents,
  mapTimelineFromSources,
} from '../financial-calendar.builder';
import type { FinancialCalendarEvent } from '@cardwise/validation';

describe('financial calendar builders', () => {
  it('maps bill dues and buckets by day', () => {
    const events = mapBillDueEvents([
      {
        id: 'bill-1',
        cardName: 'Atlas',
        dueDate: '2026-07-15T12:00:00.000Z',
        daysUntilDue: 1,
        totalDueInr: 12000,
        status: 'UPCOMING',
      },
    ]);

    expect(events[0]?.type).toBe('bill_due');
    expect(events[0]?.date).toBe('2026-07-15');

    const days = bucketEventsByDay(2026, 7, events);
    expect(days).toHaveLength(31);
    expect(days.find((day) => day.date === '2026-07-15')?.events).toHaveLength(1);
  });

  it('filters event types and counts them', () => {
    const events: FinancialCalendarEvent[] = [
      ...mapMilestoneEndEvents([
        {
          id: 'm1',
          cardName: 'Atlas',
          label: 'Quarterly bonus',
          periodEnd: '2026-07-31T00:00:00.000Z',
          remainingSpendInr: 9200,
          progressPercent: 80,
          status: 'IN_PROGRESS',
        },
      ]),
      ...mapRewardExpiryEvents([
        {
          userCardId: 'c1',
          cardName: 'Atlas',
          kind: 'POINTS',
          expiringAmount: 2000,
          expiringAt: '2026-07-20T00:00:00.000Z',
          estimatedValueInr: 500,
        },
      ]),
      ...mapOfferExpiryEvents([
        {
          id: 'o1',
          title: 'Dining boost',
          validUntil: '2026-07-25T00:00:00.000Z',
          cashbackPercent: '10',
          merchantName: 'Swiggy',
        },
      ]),
    ];

    const filtered = filterEventsByType(events, ['milestone_end', 'reward_expiry']);
    expect(filtered).toHaveLength(2);
    expect(countEventsByType(events).offer_expiry).toBe(1);

    const agenda = eventsInRange(events, '2026-07-01', '2026-07-22');
    expect(agenda.some((event) => event.type === 'reward_expiry')).toBe(true);
    expect(agenda.some((event) => event.type === 'offer_expiry')).toBe(false);
  });

  it('builds chronological timeline from domain sources', () => {
    const items = mapTimelineFromSources({
      cards: [
        {
          id: 'card-1',
          cardName: 'Atlas',
          addedAt: '2026-07-01T00:00:00.000Z',
        },
      ],
      transactions: [
        {
          id: 'txn-1',
          merchantName: 'Swiggy',
          cardName: 'Atlas',
          amountInr: 850,
          transactedAt: '2026-07-10T00:00:00.000Z',
        },
      ],
      statements: [],
      notifications: [
        {
          id: 'n1',
          type: 'MILESTONE_PROGRESS',
          title: 'Milestone alert',
          body: 'Almost there',
          linkUrl: '/account/milestones',
          createdAt: '2026-07-11T00:00:00.000Z',
        },
      ],
      reminders: [],
    });

    expect(items[0]?.category).toBe('notification');
    expect(items.some((item) => item.category === 'transaction')).toBe(true);
    expect(items.some((item) => item.category === 'card')).toBe(true);
  });
});
