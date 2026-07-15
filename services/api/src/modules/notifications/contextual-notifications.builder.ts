import {
  BILL_DUE_ALERT_WINDOWS,
  MILESTONE_PROGRESS_WINDOWS,
  type BillDueAlertWindow,
  type ContextualNotificationCandidate,
  type MilestoneProgressWindow,
} from '@cardwise/validation';

const TRAILING_OPAQUE_ID = /\s+[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function stripTrailingOpaqueId(title: string | null | undefined): string {
  return (title ?? '').replace(TRAILING_OPAQUE_ID, '').trim();
}

function formatInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function resolveBillDueWindow(daysUntilDue: number): BillDueAlertWindow | null {
  for (const window of BILL_DUE_ALERT_WINDOWS) {
    if (daysUntilDue <= window) return window;
  }
  return null;
}

export function resolveMilestoneProgressWindow(
  progressPercent: number,
): MilestoneProgressWindow | null {
  let matched: MilestoneProgressWindow | null = null;
  for (const window of MILESTONE_PROGRESS_WINDOWS) {
    if (progressPercent >= window) matched = window;
  }
  return matched;
}

export function buildContextualDedupeKey(parts: Array<string | number>): string {
  return parts.map(String).join(':');
}

export function buildMilestoneCandidates(
  milestones: Array<{
    id: string;
    cardName: string;
    label: string;
    remainingSpendInr: number;
    progressPercent: number;
    daysRemaining: number;
    status: string;
  }>,
): ContextualNotificationCandidate[] {
  const candidates: ContextualNotificationCandidate[] = [];

  for (const milestone of milestones) {
    if (milestone.status === 'ACHIEVED') continue;
    if (milestone.remainingSpendInr <= 0) continue;
    const window = resolveMilestoneProgressWindow(milestone.progressPercent);
    if (window == null) continue;

    candidates.push({
      type: 'MILESTONE_PROGRESS',
      title: `You're ${formatInr(milestone.remainingSpendInr)} away from your next milestone`,
      body: `${milestone.label} on ${milestone.cardName} is ${Math.round(milestone.progressPercent)}% complete · ${milestone.daysRemaining} day${milestone.daysRemaining === 1 ? '' : 's'} left.`,
      linkUrl: '/account/milestones',
      dedupeKey: buildContextualDedupeKey(['milestone-progress', milestone.id, window]),
      priority: window >= 75 ? 'high' : 'medium',
    });
  }

  return candidates;
}

export function buildBillDueCandidates(
  bills: Array<{
    id: string;
    cardName: string;
    daysUntilDue: number;
    totalDueInr: number | null;
    status: string;
  }>,
): ContextualNotificationCandidate[] {
  const candidates: ContextualNotificationCandidate[] = [];

  for (const bill of bills) {
    if (bill.status === 'PAID') continue;
    const window = resolveBillDueWindow(bill.daysUntilDue);
    if (window == null) continue;

    const amount =
      bill.totalDueInr != null && bill.totalDueInr > 0
        ? ` · ${formatInr(bill.totalDueInr)} due`
        : '';
    const when =
      bill.daysUntilDue <= 0
        ? 'due today'
        : bill.daysUntilDue === 1
          ? 'due tomorrow'
          : `due in ${bill.daysUntilDue} days`;

    candidates.push({
      type: 'BILL_DUE',
      title: `${bill.cardName} payment ${when}`,
      body: `A bill for ${bill.cardName} is ${when}${amount}. Review statements and pay on time to protect your rewards record.`,
      linkUrl: '/account/billing',
      dedupeKey: buildContextualDedupeKey(['bill-due', bill.id, window]),
      priority: bill.daysUntilDue <= 1 ? 'high' : 'medium',
    });
  }

  return candidates;
}

export function buildOfferMatchCandidates(
  offers: Array<{
    id: string;
    title: string;
    cashbackPercent: string | null;
    bestEstimatedSavingsInr: number | null;
    isEligible: boolean;
    merchantName: string | null;
  }>,
): ContextualNotificationCandidate[] {
  const top = offers
    .filter((offer) => offer.isEligible)
    .sort((a, b) => (b.bestEstimatedSavingsInr ?? 0) - (a.bestEstimatedSavingsInr ?? 0))[0];
  if (!top) return [];

  const cashback = top.cashbackPercent ? `${top.cashbackPercent}% cashback` : 'a better reward';
  const merchant = top.merchantName ? ` at ${top.merchantName}` : '';
  const savings =
    top.bestEstimatedSavingsInr != null && top.bestEstimatedSavingsInr > 0
      ? ` Est. savings ${formatInr(top.bestEstimatedSavingsInr)} on sample spend.`
      : '';

  return [
    {
      type: 'OFFER_MATCH',
      title: 'A better cashback offer is available today',
      body: `${stripTrailingOpaqueId(top.title) || top.title} unlocks ${cashback}${merchant}.${savings}`,
      linkUrl: '/account/offers',
      dedupeKey: buildContextualDedupeKey(['offer-match', top.id]),
      priority: 'medium',
    },
  ];
}

export function buildTravelTipCandidates(input: {
  loungeCardCount: number;
  totalMiles: number;
  bestCardName: string | null;
  hasTravelContext: boolean;
  weekKey: string;
}): ContextualNotificationCandidate[] {
  if (!input.hasTravelContext) return [];

  const cardHint = input.bestCardName
    ? `Use your ${input.bestCardName} for your next hotel booking.`
    : 'Use your strongest travel card for the next hotel booking.';
  const lounge =
    input.loungeCardCount > 0
      ? ` ${input.loungeCardCount} lounge-ready card${input.loungeCardCount === 1 ? '' : 's'} in your wallet.`
      : '';
  const miles =
    input.totalMiles > 0
      ? ` ${Math.round(input.totalMiles).toLocaleString('en-IN')} miles tracked.`
      : '';

  return [
    {
      type: 'TRAVEL_TIP',
      title: 'Optimize your next trip',
      body: `${cardHint}${lounge}${miles}`,
      linkUrl: '/account/travel',
      dedupeKey: buildContextualDedupeKey(['travel-tip', input.weekKey]),
      priority: 'low',
    },
  ];
}

export function buildPurchaseTimingCandidates(
  upcomingOffers: Array<{
    id: string;
    title: string;
    cashbackPercent: string | null;
    validFrom: string;
    hoursUntilStart: number;
  }>,
): ContextualNotificationCandidate[] {
  const soon = upcomingOffers
    .filter((offer) => offer.hoursUntilStart > 0 && offer.hoursUntilStart <= 48)
    .sort((a, b) => a.hoursUntilStart - b.hoursUntilStart)[0];
  if (!soon) return [];

  const rate = soon.cashbackPercent ? ` (${soon.cashbackPercent}% cashback)` : '';
  const hours = Math.max(1, Math.ceil(soon.hoursUntilStart));

  return [
    {
      type: 'PURCHASE_TIMING',
      title: 'Consider delaying this purchase by 48 hours',
      body: `${soon.title}${rate} starts in about ${hours} hour${hours === 1 ? '' : 's'}. Waiting may unlock a better return.`,
      linkUrl: '/account/offers',
      dedupeKey: buildContextualDedupeKey(['purchase-timing', soon.id]),
      priority: 'medium',
    },
  ];
}

export function collectContextualCandidates(parts: ContextualNotificationCandidate[][]): {
  candidates: ContextualNotificationCandidate[];
} {
  const priorityRank = { high: 0, medium: 1, low: 2 } as const;
  const candidates = parts
    .flat()
    .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority])
    .slice(0, 12);
  return { candidates };
}

export function isoWeekKey(now = new Date()): string {
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}
