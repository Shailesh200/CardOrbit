import { parseIngestCardBundle, type IngestCardBundle } from '@cardwise/validation';

import type { RecoExplanation } from '@cardwise/validation';

const INR_PATTERN = /₹[\d,]+(?:\.\d{1,2})?/g;
const PERCENT_PATTERN = /(\d+(?:\.\d+)?)\s*(?:%|percent)/gi;
const MULTIPLIER_PATTERN = /(\d+(?:\.\d+)?)\s*[x×]\b/gi;

export function parseInrToken(token: string): number | null {
  const normalized = token.replace(/[₹,\s]/g, '');
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

export function extractInrAmounts(text: string): number[] {
  return [...text.matchAll(INR_PATTERN)]
    .map((match) => parseInrToken(match[0]!))
    .filter((value): value is number => value != null);
}

function extractAuditNumericValues(auditJson: string): number[] {
  const values = new Set<number>();
  for (const amount of extractInrAmounts(auditJson)) {
    values.add(amount);
  }
  for (const match of auditJson.matchAll(/(-?\d+(?:\.\d+)?)/g)) {
    const value = Number.parseFloat(match[1]!);
    if (Number.isFinite(value)) values.add(value);
  }
  return [...values];
}

export function findUngroundedAmounts(explanation: string, auditJson: string, toleranceInr = 1): string[] {
  const auditAmounts = extractAuditNumericValues(auditJson);
  const tokens = [...explanation.matchAll(INR_PATTERN)].map((match) => match[0]!);

  return tokens.filter((token) => {
    const value = parseInrToken(token);
    if (value == null) return true;

    const grounded = auditAmounts.some((auditValue) => Math.abs(auditValue - value) <= toleranceInr);
    if (grounded) return false;

    const compact = token.replace(/,/g, '');
    return !auditJson.includes(compact) && !auditJson.includes(token);
  });
}

export function extractPercentValues(text: string): number[] {
  const values: number[] = [];
  for (const match of text.matchAll(PERCENT_PATTERN)) {
    const value = Number.parseFloat(match[1]!);
    if (Number.isFinite(value)) values.push(value);
  }
  return values;
}

export function extractMultiplierValues(text: string): number[] {
  const values: number[] = [];
  for (const match of text.matchAll(MULTIPLIER_PATTERN)) {
    const value = Number.parseFloat(match[1]!);
    if (Number.isFinite(value)) values.push(value);
  }
  return values;
}

export function findHallucinatedMultipliers(
  explanation: string,
  allowed: { percents?: number[]; multipliers?: number[] },
): string[] {
  const issues: string[] = [];
  const allowedPercents = new Set(allowed.percents ?? []);
  const allowedMultipliers = new Set(allowed.multipliers ?? []);

  for (const percent of extractPercentValues(explanation)) {
    if (allowedPercents.size > 0 && ![...allowedPercents].some((allowed) => Math.abs(allowed - percent) < 0.01)) {
      issues.push(`${percent}%`);
    }
  }

  for (const multiplier of extractMultiplierValues(explanation)) {
    if (
      allowedMultipliers.size > 0 &&
      ![...allowedMultipliers].some((allowed) => Math.abs(allowed - multiplier) < 0.01)
    ) {
      issues.push(`${multiplier}x`);
    }
  }

  return issues;
}

export function assertExplanationMentionsCard(explanation: string, cardName: string): boolean {
  const normalizedExplanation = explanation.toLowerCase();
  const tokens = cardName
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 2);
  if (tokens.length === 0) return normalizedExplanation.includes(cardName.toLowerCase());
  return tokens.every((token) => normalizedExplanation.includes(token));
}

export function validateRecoExplanationSafety(input: {
  explanation: RecoExplanation;
  auditJson: string;
  recommendedCardName: string;
  mentionsCard?: boolean;
  allowedPercents?: number[];
  allowedMultipliers?: number[];
  toleranceInr?: number;
}): string[] {
  const issues: string[] = [];
  const text = `${input.explanation.explanation} ${input.explanation.shortSummary} ${input.explanation.bulletReasons.join(' ')}`;

  if (input.mentionsCard !== false && !assertExplanationMentionsCard(text, input.recommendedCardName)) {
    issues.push(`explanation does not mention recommended card "${input.recommendedCardName}"`);
  }

  const ungrounded = findUngroundedAmounts(text, input.auditJson, input.toleranceInr ?? 1);
  if (ungrounded.length > 0) {
    issues.push(`ungrounded ₹ amounts: ${ungrounded.join(', ')}`);
  }

  const multiplierIssues = findHallucinatedMultipliers(text, {
    percents: input.allowedPercents,
    multipliers: input.allowedMultipliers,
  });
  if (multiplierIssues.length > 0) {
    issues.push(`hallucinated multipliers/rates: ${multiplierIssues.join(', ')}`);
  }

  return issues;
}

export function validateCatalogBundleSafety(bundle: IngestCardBundle): string[] {
  const issues: string[] = [];

  try {
    parseIngestCardBundle(bundle);
  } catch (error) {
    issues.push(error instanceof Error ? error.message : 'invalid ingest bundle schema');
    return issues;
  }

  if (!bundle.slug.startsWith(`${bundle.bankSlug}-`)) {
    issues.push(`slug "${bundle.slug}" must start with bank slug "${bundle.bankSlug}-"`);
  }

  for (const highlight of bundle.highlights) {
    if (!highlight.sourceUrl) {
      issues.push(`highlight "${highlight.title}" missing sourceUrl`);
    }
  }

  if (bundle.annualFeeInr != null && bundle.annualFeeInr > 100_000) {
    issues.push(`annualFeeInr ${bundle.annualFeeInr} looks implausible`);
  }

  if (bundle.joiningFeeInr != null && bundle.joiningFeeInr > 100_000) {
    issues.push(`joiningFeeInr ${bundle.joiningFeeInr} looks implausible`);
  }

  return issues;
}
