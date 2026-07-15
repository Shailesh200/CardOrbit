import { authFetch } from '@cardwise/auth';

const API_BASE = import.meta.env.VITE_API_URL || '';

export type FinancialCalendarEventType =
  | 'bill_due'
  | 'statement'
  | 'milestone_end'
  | 'fee_waiver_end'
  | 'reward_expiry'
  | 'offer_expiry'
  | 'custom_reminder';

export type FinancialCalendarEvent = {
  id: string;
  type: FinancialCalendarEventType;
  title: string;
  body: string;
  date: string;
  endsAt: string | null;
  amountInr: number | null;
  linkUrl: string;
  cardName: string | null;
  status: string | null;
  priority: 'high' | 'medium' | 'low';
};

export type FinancialCalendarMonthResponse = {
  year: number;
  month: number;
  days: Array<{ date: string; events: FinancialCalendarEvent[] }>;
  upcoming: FinancialCalendarEvent[];
  countsByType: Record<string, number>;
};

export type FinancialCalendarAgendaResponse = {
  from: string;
  to: string;
  items: FinancialCalendarEvent[];
};

export type TimelineEvent = {
  id: string;
  category: string;
  title: string;
  body: string;
  occurredAt: string;
  linkUrl: string | null;
  amountInr: number | null;
};

export type TimelineResponse = {
  items: TimelineEvent[];
  total: number;
  page: number;
  pageSize: number;
};

export type CalendarReminder = {
  id: string;
  title: string;
  description: string | null;
  eventDate: string;
  reminderOffsetDays: number;
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
  updatedAt: string;
};

export const EVENT_TYPE_LABELS: Record<FinancialCalendarEventType, string> = {
  bill_due: 'Bill due',
  statement: 'Statement',
  milestone_end: 'Milestone',
  fee_waiver_end: 'Fee waiver',
  reward_expiry: 'Reward expiry',
  offer_expiry: 'Offer ends',
  custom_reminder: 'Reminder',
};

export function formatCalendarInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function getFinancialCalendarMonth(year: number, month: number, types?: string[]) {
  const params = new URLSearchParams({
    year: String(year),
    month: String(month),
  });
  if (types && types.length > 0) params.set('types', types.join(','));
  return authFetch<FinancialCalendarMonthResponse>(
    `/api/v1/calendar?${params.toString()}`,
    {},
    API_BASE,
  );
}

export function getFinancialCalendarAgenda(days = 30, types?: string[]) {
  const params = new URLSearchParams({ days: String(days) });
  if (types && types.length > 0) params.set('types', types.join(','));
  return authFetch<FinancialCalendarAgendaResponse>(
    `/api/v1/calendar/agenda?${params.toString()}`,
    {},
    API_BASE,
  );
}

export function getFinancialTimeline(page = 1, pageSize = 25, category?: string) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (category) params.set('category', category);
  return authFetch<TimelineResponse>(
    `/api/v1/calendar/timeline?${params.toString()}`,
    {},
    API_BASE,
  );
}

export function listCalendarReminders() {
  return authFetch<CalendarReminder[]>('/api/v1/calendar/reminders', {}, API_BASE);
}

export function createCalendarReminder(body: {
  title: string;
  description?: string | null;
  eventDate: string;
  reminderOffsetDays?: number;
  priority?: 'high' | 'medium' | 'low';
}) {
  return authFetch<CalendarReminder>(
    '/api/v1/calendar/reminders',
    { method: 'POST', body: JSON.stringify(body) },
    API_BASE,
  );
}

export function deleteCalendarReminder(id: string) {
  return authFetch<{ deleted: true }>(
    `/api/v1/calendar/reminders/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
    API_BASE,
  );
}
