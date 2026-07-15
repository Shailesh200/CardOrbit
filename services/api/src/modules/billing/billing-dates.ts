export type BillingCycleDates = {
  periodStart: Date;
  periodEnd: Date;
  statementDate: Date;
  dueDate: Date;
};

export function clampDayOfMonth(year: number, monthIndex: number, day: number): number {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return Math.min(Math.max(day, 1), lastDay);
}

export function dateAtUtcDay(year: number, monthIndex: number, day: number): Date {
  const clamped = clampDayOfMonth(year, monthIndex, day);
  return new Date(Date.UTC(year, monthIndex, clamped, 12, 0, 0, 0));
}

export function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0),
  );
}

export function daysUntil(from: Date, to: Date): number {
  const start = startOfUtcDay(from).getTime();
  const end = startOfUtcDay(to).getTime();
  return Math.round((end - start) / (24 * 60 * 60 * 1000));
}

export function computeBillingCycle(input: {
  statementDay: number;
  dueDay: number;
  referenceDate?: Date;
}): BillingCycleDates {
  const reference = input.referenceDate ?? new Date();
  const year = reference.getUTCFullYear();
  const month = reference.getUTCMonth();
  const todayDay = reference.getUTCDate();

  let statementMonth = month;
  let statementYear = year;
  if (todayDay < input.statementDay) {
    statementMonth -= 1;
    if (statementMonth < 0) {
      statementMonth = 11;
      statementYear -= 1;
    }
  }

  const statementDate = dateAtUtcDay(statementYear, statementMonth, input.statementDay);

  let previousStatementMonth = statementMonth - 1;
  let previousStatementYear = statementYear;
  if (previousStatementMonth < 0) {
    previousStatementMonth = 11;
    previousStatementYear -= 1;
  }

  const previousStatementDate = dateAtUtcDay(
    previousStatementYear,
    previousStatementMonth,
    input.statementDay,
  );

  const periodStart = new Date(previousStatementDate.getTime() + 24 * 60 * 60 * 1000);
  const periodEnd = statementDate;

  let dueMonth = statementMonth;
  let dueYear = statementYear;
  if (input.dueDay <= input.statementDay) {
    dueMonth += 1;
    if (dueMonth > 11) {
      dueMonth = 0;
      dueYear += 1;
    }
  }

  const dueDate = dateAtUtcDay(dueYear, dueMonth, input.dueDay);

  return { periodStart, periodEnd, statementDate, dueDate };
}

export function nextOccurrenceOfDay(day: number, from: Date): Date {
  const year = from.getUTCFullYear();
  const month = from.getUTCMonth();
  const candidate = dateAtUtcDay(year, month, day);
  if (candidate.getTime() >= startOfUtcDay(from).getTime()) {
    return candidate;
  }

  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth > 11) {
    nextMonth = 0;
    nextYear += 1;
  }

  return dateAtUtcDay(nextYear, nextMonth, day);
}

export function resolveStatementStatus(input: {
  storedStatus: 'OPEN' | 'PAID' | 'OVERDUE' | 'PARTIAL';
  dueDate: Date;
  today?: Date;
}): 'OPEN' | 'PAID' | 'OVERDUE' | 'PARTIAL' {
  if (input.storedStatus === 'PAID') return 'PAID';
  const today = input.today ?? new Date();
  if (daysUntil(today, input.dueDate) < 0 && input.storedStatus !== 'PARTIAL') {
    return 'OVERDUE';
  }
  return input.storedStatus;
}

export function toBillDisplayStatus(input: {
  kind: 'statement' | 'upcoming';
  statementStatus?: 'OPEN' | 'PAID' | 'OVERDUE' | 'PARTIAL';
  dueDate: Date;
  today?: Date;
}): 'UPCOMING' | 'OPEN' | 'PAID' | 'OVERDUE' | 'PARTIAL' | 'PROCESSING' {
  if (input.kind === 'upcoming') return 'UPCOMING';
  const status = input.statementStatus ?? 'OPEN';
  if (status === 'PAID') return 'PAID';
  if (status === 'PARTIAL') return 'PARTIAL';
  const today = input.today ?? new Date();
  if (daysUntil(today, input.dueDate) < 0) return 'OVERDUE';
  return 'OPEN';
}

export function buildUpcomingBillId(userCardId: string, dueDate: Date): string {
  const key = dueDate.toISOString().slice(0, 10);
  return `upcoming:${userCardId}:${key}`;
}

export function parseUpcomingBillId(id: string): { userCardId: string; dueDate: Date } | null {
  if (!id.startsWith('upcoming:')) return null;
  const parts = id.split(':');
  if (parts.length !== 3) return null;
  const dueDate = new Date(`${parts[2]}T12:00:00.000Z`);
  if (Number.isNaN(dueDate.getTime())) return null;
  return { userCardId: parts[1]!, dueDate };
}
