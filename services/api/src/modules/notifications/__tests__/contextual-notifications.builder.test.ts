import { describe, expect, it } from 'vitest';

import {
  buildBillDueCandidates,
  buildMilestoneCandidates,
  buildOfferMatchCandidates,
  buildPurchaseTimingCandidates,
  buildTravelTipCandidates,
  collectContextualCandidates,
  resolveBillDueWindow,
  resolveMilestoneProgressWindow,
} from '../contextual-notifications.builder';

describe('resolveBillDueWindow', () => {
  it('maps days until due into alert windows', () => {
    expect(resolveBillDueWindow(0)).toBe(0);
    expect(resolveBillDueWindow(1)).toBe(1);
    expect(resolveBillDueWindow(2)).toBe(3);
    expect(resolveBillDueWindow(7)).toBe(7);
    expect(resolveBillDueWindow(10)).toBeNull();
  });
});

describe('resolveMilestoneProgressWindow', () => {
  it('returns highest crossed threshold', () => {
    expect(resolveMilestoneProgressWindow(40)).toBeNull();
    expect(resolveMilestoneProgressWindow(50)).toBe(50);
    expect(resolveMilestoneProgressWindow(80)).toBe(75);
    expect(resolveMilestoneProgressWindow(95)).toBe(90);
  });
});

describe('contextual notification formatters', () => {
  it('builds milestone progress copy matching roadmap examples', () => {
    const [candidate] = buildMilestoneCandidates([
      {
        id: 'm1',
        cardName: 'Atlas',
        label: 'Quarterly bonus',
        remainingSpendInr: 9200,
        progressPercent: 80,
        daysRemaining: 12,
        status: 'IN_PROGRESS',
      },
    ]);

    expect(candidate?.title).toBe("You're ₹9,200 away from your next milestone");
    expect(candidate?.type).toBe('MILESTONE_PROGRESS');
    expect(candidate?.dedupeKey).toContain('75');
  });

  it('builds bill due, offer, travel tip, and purchase timing candidates', () => {
    const collected = collectContextualCandidates([
      buildBillDueCandidates([
        {
          id: 'bill-1',
          cardName: 'Atlas',
          daysUntilDue: 1,
          totalDueInr: 12000,
          status: 'UPCOMING',
        },
      ]),
      buildOfferMatchCandidates([
        {
          id: 'offer-1',
          title: 'Weekend dining boost',
          cashbackPercent: '10',
          bestEstimatedSavingsInr: 250,
          isEligible: true,
          merchantName: 'Swiggy',
        },
      ]),
      buildTravelTipCandidates({
        loungeCardCount: 1,
        totalMiles: 15000,
        bestCardName: 'Atlas',
        hasTravelContext: true,
        weekKey: '2026-W29',
      }),
      buildPurchaseTimingCandidates([
        {
          id: 'soon-1',
          title: 'Hotel flash cashback',
          cashbackPercent: '8',
          validFrom: '2026-07-15T00:00:00.000Z',
          hoursUntilStart: 18,
        },
      ]),
    ]);

    expect(collected.candidates.some((row) => row.type === 'BILL_DUE')).toBe(true);
    expect(collected.candidates.find((row) => row.type === 'OFFER_MATCH')?.title).toContain(
      'better cashback offer',
    );
    expect(collected.candidates.find((row) => row.type === 'TRAVEL_TIP')?.body).toContain('Atlas');
    expect(collected.candidates.find((row) => row.type === 'PURCHASE_TIMING')?.title).toContain(
      'delaying this purchase',
    );
  });
});
