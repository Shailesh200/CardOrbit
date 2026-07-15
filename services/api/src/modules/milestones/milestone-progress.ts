import type { MilestonePeriod, MilestoneStatus, RewardRulePayload } from '@cardwise/validation';

export type MilestoneRuleCandidate = {
  ruleId: string;
  ruleName: string;
  spendThreshold: number;
  milestoneBonus: number | null;
  period: MilestonePeriod;
};

export function extractSpendMilestones(input: {
  ruleId: string;
  ruleName: string;
  payload: RewardRulePayload;
}): MilestoneRuleCandidate[] {
  const payload = input.payload;
  if (payload.spendThreshold == null || payload.spendThreshold <= 0) return [];

  const mode = payload.milestoneMode ?? 'single_transaction';
  if (mode === 'single_transaction') {
    return [
      {
        ruleId: input.ruleId,
        ruleName: input.ruleName,
        spendThreshold: payload.spendThreshold,
        milestoneBonus: payload.milestoneBonus ?? null,
        period: payload.milestonePeriod ?? 'annual',
      },
    ];
  }

  return [
    {
      ruleId: input.ruleId,
      ruleName: input.ruleName,
      spendThreshold: payload.spendThreshold,
      milestoneBonus: payload.milestoneBonus ?? null,
      period: payload.milestonePeriod ?? 'quarterly',
    },
  ];
}

export function computeProgress(input: { currentSpendInr: number; thresholdInr: number }): {
  progressPercent: number;
  remainingSpendInr: number;
  status: MilestoneStatus;
} {
  const threshold = Math.max(input.thresholdInr, 0);
  const current = Math.max(input.currentSpendInr, 0);

  if (threshold === 0) {
    return { progressPercent: 100, remainingSpendInr: 0, status: 'ACHIEVED' };
  }

  const progressPercent = Math.min(100, Math.round((current / threshold) * 1000) / 10);
  const remainingSpendInr = Math.max(0, Math.round((threshold - current) * 100) / 100);

  let status: MilestoneStatus = 'NOT_STARTED';
  if (current >= threshold) status = 'ACHIEVED';
  else if (current > 0) status = 'IN_PROGRESS';

  return { progressPercent, remainingSpendInr, status };
}

export function parseFeeWaiverThreshold(waiverConditions: unknown): {
  requiredSpendInr: number | null;
  summary: string | null;
} {
  if (waiverConditions == null) {
    return { requiredSpendInr: null, summary: null };
  }

  if (typeof waiverConditions === 'string') {
    const match = waiverConditions.match(/(?:₹|rs\.?\s*)?([\d,]+(?:\.\d+)?)\s*(?:lakh|lac|k)?/i);
    if (!match?.[1]) return { requiredSpendInr: null, summary: waiverConditions };
    let amount = Number.parseFloat(match[1].replace(/,/g, ''));
    if (/lakh|lac/i.test(waiverConditions)) amount *= 100_000;
    else if (/k\b/i.test(waiverConditions) && amount < 1000) amount *= 1000;
    return {
      requiredSpendInr: Number.isFinite(amount) ? amount : null,
      summary: waiverConditions,
    };
  }

  if (typeof waiverConditions === 'object') {
    const value = waiverConditions as Record<string, unknown>;
    const raw =
      value.spendThresholdInr ??
      value.spendThreshold ??
      value.amountInr ??
      value.thresholdInr ??
      value.requiredSpendInr;
    const amount = typeof raw === 'number' ? raw : Number(raw);
    const summary =
      typeof value.summary === 'string'
        ? value.summary
        : typeof value.description === 'string'
          ? value.description
          : null;
    return {
      requiredSpendInr: Number.isFinite(amount) && amount > 0 ? amount : null,
      summary,
    };
  }

  return { requiredSpendInr: null, summary: null };
}

export function buildMilestoneLabel(input: {
  spendThreshold: number;
  milestoneBonus: number | null;
  ruleName: string;
}): string {
  if (input.milestoneBonus != null) {
    return `Spend ₹${Math.round(input.spendThreshold).toLocaleString('en-IN')} — earn ${Math.round(input.milestoneBonus).toLocaleString('en-IN')} bonus`;
  }
  return `Spend ₹${Math.round(input.spendThreshold).toLocaleString('en-IN')} — ${input.ruleName}`;
}
