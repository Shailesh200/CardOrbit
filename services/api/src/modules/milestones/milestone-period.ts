import type { MilestonePeriod } from '@cardwise/validation';

export type PeriodBounds = {
  start: Date;
  end: Date;
  label: string;
};

export function periodBounds(period: MilestonePeriod, at: Date = new Date()): PeriodBounds {
  const year = at.getUTCFullYear();
  const month = at.getUTCMonth();

  switch (period) {
    case 'monthly': {
      const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
      return {
        start,
        end,
        label: start.toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
      };
    }
    case 'quarterly': {
      const quarter = Math.floor(month / 3);
      const startMonth = quarter * 3;
      const start = new Date(Date.UTC(year, startMonth, 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(year, startMonth + 3, 0, 23, 59, 59, 999));
      return {
        start,
        end,
        label: `Q${quarter + 1} ${year}`,
      };
    }
    case 'annual':
    default: {
      const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
      return {
        start,
        end,
        label: `Calendar ${year}`,
      };
    }
  }
}

export function daysRemainingInPeriod(end: Date, today: Date = new Date()): number {
  const endDay = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  const todayDay = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.max(0, Math.round((endDay - todayDay) / (24 * 60 * 60 * 1000)));
}

export function daysElapsedInPeriod(start: Date, today: Date = new Date()): number {
  const startDay = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const todayDay = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.max(1, Math.round((todayDay - startDay) / (24 * 60 * 60 * 1000)) + 1);
}

export function estimateCompletionDate(input: {
  currentSpendInr: number;
  thresholdInr: number;
  periodStart: Date;
  today?: Date;
}): Date | null {
  const today = input.today ?? new Date();
  if (input.currentSpendInr >= input.thresholdInr) return today;

  const elapsedDays = daysElapsedInPeriod(input.periodStart, today);
  const averageDaily = input.currentSpendInr / elapsedDays;
  if (averageDaily <= 0) return null;

  const remaining = input.thresholdInr - input.currentSpendInr;
  const daysNeeded = Math.ceil(remaining / averageDaily);
  const estimated = new Date(today);
  estimated.setUTCDate(estimated.getUTCDate() + daysNeeded);
  return estimated;
}
