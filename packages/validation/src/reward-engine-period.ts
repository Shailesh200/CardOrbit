/** Calendar helpers for rolling caps and quarterly campaigns (M-026). */

export type CapPeriod = 'transaction' | 'monthly' | 'quarterly' | 'annual';

export type MilestonePeriod = 'monthly' | 'quarterly' | 'annual';

/** Calendar quarter 1–4 (Jan–Mar = Q1). */
export function calendarQuarter(at: Date): number {
  return Math.floor(at.getUTCMonth() / 3) + 1;
}

export function isQuarterActive(at: Date, activeQuarters?: number[]): boolean {
  if (!activeQuarters?.length) return true;
  return activeQuarters.includes(calendarQuarter(at));
}
