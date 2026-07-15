import type {
  CalendarReminder,
  FinancialCalendarEvent,
  FinancialCalendarEventType,
  TimelineEvent,
} from '@cardwise/validation';

const TRAILING_OPAQUE_ID = /\s+[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function stripTrailingOpaqueId(title: string | null | undefined): string {
  return (title ?? '').replace(TRAILING_OPAQUE_ID, '').trim();
}

function formatInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function dateKey(isoOrDate: string | Date): string {
  if (typeof isoOrDate === 'string') {
    return isoOrDate.slice(0, 10);
  }
  return isoOrDate.toISOString().slice(0, 10);
}

export function filterEventsByType(
  events: FinancialCalendarEvent[],
  types?: FinancialCalendarEventType[],
): FinancialCalendarEvent[] {
  if (!types || types.length === 0) return events;
  const allowed = new Set(types);
  return events.filter((event) => allowed.has(event.type));
}

export function sortCalendarEvents(events: FinancialCalendarEvent[]): FinancialCalendarEvent[] {
  const priorityRank = { high: 0, medium: 1, low: 2 } as const;
  return [...events].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return priorityRank[a.priority] - priorityRank[b.priority];
  });
}

export function bucketEventsByDay(
  year: number,
  month: number,
  events: FinancialCalendarEvent[],
): Array<{ date: string; events: FinancialCalendarEvent[] }> {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const byDate = new Map<string, FinancialCalendarEvent[]>();

  for (const event of events) {
    const list = byDate.get(event.date) ?? [];
    list.push(event);
    byDate.set(event.date, list);
  }

  const days = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
    days.push({
      date,
      events: sortCalendarEvents(byDate.get(date) ?? []),
    });
  }
  return days;
}

export function countEventsByType(events: FinancialCalendarEvent[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const event of events) {
    counts[event.type] = (counts[event.type] ?? 0) + 1;
  }
  return counts;
}

export function mapBillDueEvents(
  bills: Array<{
    id: string;
    cardName: string;
    dueDate: string;
    daysUntilDue: number;
    totalDueInr: number | null;
    status: string;
  }>,
): FinancialCalendarEvent[] {
  return bills.map((bill) => ({
    id: `bill:${bill.id}`,
    type: 'bill_due' as const,
    title: `${bill.cardName} payment due`,
    body:
      bill.totalDueInr != null && bill.totalDueInr > 0
        ? `${formatInr(bill.totalDueInr)} · ${bill.status.replaceAll('_', ' ').toLowerCase()}`
        : `Bill ${bill.status.replaceAll('_', ' ').toLowerCase()}`,
    date: dateKey(bill.dueDate),
    endsAt: bill.dueDate,
    amountInr: bill.totalDueInr,
    linkUrl: '/account/billing',
    cardName: bill.cardName,
    status: bill.status,
    priority: bill.daysUntilDue <= 1 || bill.status === 'OVERDUE' ? 'high' : 'medium',
  }));
}

export function mapStatementDayEvents(
  year: number,
  month: number,
  cards: Array<{ userCardId: string; cardName: string; statementDay: number | null }>,
): FinancialCalendarEvent[] {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const events: FinancialCalendarEvent[] = [];

  for (const card of cards) {
    if (card.statementDay == null) continue;
    if (card.statementDay < 1 || card.statementDay > daysInMonth) continue;
    const date = new Date(Date.UTC(year, month - 1, card.statementDay)).toISOString().slice(0, 10);
    events.push({
      id: `statement:${card.userCardId}:${date}`,
      type: 'statement',
      title: `${card.cardName} statement date`,
      body: 'Expected statement day for this card.',
      date,
      endsAt: null,
      amountInr: null,
      linkUrl: '/account/billing',
      cardName: card.cardName,
      status: null,
      priority: 'low',
    });
  }

  return events;
}

export function mapMilestoneEndEvents(
  milestones: Array<{
    id: string;
    cardName: string;
    label: string;
    periodEnd: string;
    remainingSpendInr: number;
    progressPercent: number;
    status: string;
  }>,
): FinancialCalendarEvent[] {
  return milestones
    .filter((row) => row.status !== 'ACHIEVED')
    .map((row) => ({
      id: `milestone:${row.id}`,
      type: 'milestone_end' as const,
      title: `${row.label} period ends`,
      body: `${row.cardName} · ${Math.round(row.progressPercent)}% · ${formatInr(row.remainingSpendInr)} remaining`,
      date: dateKey(row.periodEnd),
      endsAt: row.periodEnd,
      amountInr: row.remainingSpendInr,
      linkUrl: '/account/milestones',
      cardName: row.cardName,
      status: row.status,
      priority: row.progressPercent >= 75 ? 'high' : 'medium',
    }));
}

export function mapFeeWaiverEndEvents(
  items: Array<{
    userCardId: string;
    cardName: string;
    periodEnd: string;
    remainingSpendInr: number;
    progressPercent: number;
    status: string;
  }>,
): FinancialCalendarEvent[] {
  return items
    .filter((row) => row.status !== 'ACHIEVED')
    .map((row) => ({
      id: `fee-waiver:${row.userCardId}:${dateKey(row.periodEnd)}`,
      type: 'fee_waiver_end' as const,
      title: `${row.cardName} fee-waiver window ends`,
      body: `${Math.round(row.progressPercent)}% progress · ${formatInr(row.remainingSpendInr)} left`,
      date: dateKey(row.periodEnd),
      endsAt: row.periodEnd,
      amountInr: row.remainingSpendInr,
      linkUrl: '/account/milestones',
      cardName: row.cardName,
      status: row.status,
      priority: row.progressPercent >= 75 ? 'high' : 'medium',
    }));
}

export function mapRewardExpiryEvents(
  items: Array<{
    userCardId: string;
    cardName: string;
    kind: string;
    expiringAmount: number;
    expiringAt: string;
    estimatedValueInr: number | null;
  }>,
): FinancialCalendarEvent[] {
  return items.map((item) => ({
    id: `expiry:${item.userCardId}:${item.kind}:${dateKey(item.expiringAt)}`,
    type: 'reward_expiry' as const,
    title: `${item.cardName} rewards expire`,
    body:
      item.estimatedValueInr != null && item.estimatedValueInr > 0
        ? `${formatInr(item.estimatedValueInr)} · ${item.kind.toLowerCase().replaceAll('_', ' ')}`
        : `${item.expiringAmount.toLocaleString('en-IN')} ${item.kind.toLowerCase().replaceAll('_', ' ')}`,
    date: dateKey(item.expiringAt),
    endsAt: item.expiringAt,
    amountInr: item.estimatedValueInr,
    linkUrl: '/account/rewards',
    cardName: item.cardName,
    status: item.kind,
    priority: 'high',
  }));
}

export function mapOfferExpiryEvents(
  offers: Array<{
    id: string;
    title: string;
    validUntil: string | null;
    cashbackPercent: string | null;
    merchantName: string | null;
  }>,
): FinancialCalendarEvent[] {
  return offers
    .filter((offer) => offer.validUntil != null)
    .map((offer) => ({
      id: `offer:${offer.id}`,
      type: 'offer_expiry' as const,
      title: `${stripTrailingOpaqueId(offer.title) || offer.title} ends`,
      body:
        [offer.cashbackPercent ? `${offer.cashbackPercent}% cashback` : null, offer.merchantName]
          .filter(Boolean)
          .join(' · ') || 'Matched offer ending soon',
      date: dateKey(offer.validUntil!),
      endsAt: offer.validUntil,
      amountInr: null,
      linkUrl: '/account/offers',
      cardName: null,
      status: null,
      priority: 'medium',
    }));
}

export function mapReminderEvents(reminders: CalendarReminder[]): FinancialCalendarEvent[] {
  return reminders.map((reminder) => ({
    id: `reminder:${reminder.id}`,
    type: 'custom_reminder' as const,
    title: reminder.title,
    body: reminder.description ?? 'Custom reminder',
    date: dateKey(reminder.eventDate),
    endsAt: reminder.eventDate,
    amountInr: null,
    linkUrl: '/account/calendar',
    cardName: null,
    status: reminder.priority,
    priority: reminder.priority,
  }));
}

export function eventsInRange(
  events: FinancialCalendarEvent[],
  fromKey: string,
  toKey: string,
): FinancialCalendarEvent[] {
  return sortCalendarEvents(events.filter((event) => event.date >= fromKey && event.date <= toKey));
}

export function mapTimelineFromSources(input: {
  cards: Array<{ id: string; cardName: string; addedAt: string }>;
  transactions: Array<{
    id: string;
    merchantName: string;
    cardName: string;
    amountInr: number;
    transactedAt: string;
  }>;
  statements: Array<{
    id: string;
    cardName: string;
    statementDate: string;
    totalAmountInr: number | null;
  }>;
  notifications: Array<{
    id: string;
    type: string;
    title: string;
    body: string;
    linkUrl: string | null;
    createdAt: string;
  }>;
  reminders: CalendarReminder[];
}): TimelineEvent[] {
  const items: TimelineEvent[] = [];

  for (const card of input.cards) {
    items.push({
      id: `timeline:card:${card.id}`,
      category: 'card',
      title: `Added ${card.cardName}`,
      body: 'Card added to your portfolio.',
      occurredAt: card.addedAt,
      linkUrl: `/account/cards/${card.id}`,
      amountInr: null,
    });
  }

  for (const txn of input.transactions) {
    items.push({
      id: `timeline:txn:${txn.id}`,
      category: 'transaction',
      title: txn.merchantName,
      body: `${txn.cardName} · ${formatInr(txn.amountInr)}`,
      occurredAt: txn.transactedAt,
      linkUrl: '/account/transactions',
      amountInr: txn.amountInr,
    });
  }

  for (const statement of input.statements) {
    items.push({
      id: `timeline:statement:${statement.id}`,
      category: 'billing',
      title: `${statement.cardName} statement`,
      body:
        statement.totalAmountInr != null
          ? `Total due ${formatInr(statement.totalAmountInr)}`
          : 'Statement recorded',
      occurredAt: statement.statementDate,
      linkUrl: '/account/billing',
      amountInr: statement.totalAmountInr,
    });
  }

  for (const notification of input.notifications) {
    items.push({
      id: `timeline:notif:${notification.id}`,
      category: 'notification',
      title: notification.title,
      body: notification.body,
      occurredAt: notification.createdAt,
      linkUrl: notification.linkUrl,
      amountInr: null,
    });
  }

  for (const reminder of input.reminders) {
    items.push({
      id: `timeline:reminder:${reminder.id}`,
      category: 'reminder',
      title: reminder.title,
      body: reminder.description ?? 'Custom reminder',
      occurredAt: reminder.createdAt,
      linkUrl: '/account/calendar',
      amountInr: null,
    });
  }

  return items.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
}
