import type { IngestCardBundle } from '@cardwise/validation';

export type GroundingIssueCode =
  | 'UNGROUNDED_ANNUAL_FEE'
  | 'UNGROUNDED_JOINING_FEE'
  | 'UNGROUNDED_REWARD_MULTIPLIER'
  | 'UNGROUNDED_REWARD_PERCENT'
  | 'EMPTY_REWARDS_WITH_RATE_COPY'
  | 'SAFETY';

export type GroundingClaim = {
  kind: string;
  value: string | number;
  grounded: boolean;
};

export type BundleGroundingResult = {
  score: number;
  groundedClaims: GroundingClaim[];
  ungroundedClaims: GroundingClaim[];
  issues: Array<{ code: GroundingIssueCode; message: string }>;
  critical: boolean;
};

const MULTIPLIER_IN_TEXT = /(\d+(?:\.\d+)?)\s*[x×]\b/gi;
const PERCENT_IN_TEXT = /(\d+(?:\.\d+)?)\s*(?:%|percent)/gi;
const RATE_COPY =
  /\b(\d+(?:\.\d+)?)\s*[x×]\b|\b(\d+(?:\.\d+)?)\s*%\s*(?:cashback|reward|points)|reward points per/i;

function corpusHasAmount(corpus: string, amount: number): boolean {
  if (amount === 0) {
    return /\blifetime free\b|\bzero annual fee\b|\bno annual fee\b|\bltf\b|\bjoining fee[:\s]*nil\b|\bnil\b/i.test(
      corpus,
    );
  }
  const compact = String(Math.round(amount));
  const withComma = amount.toLocaleString('en-IN');
  return (
    corpus.includes(compact) ||
    corpus.includes(withComma) ||
    corpus.includes(`₹${compact}`) ||
    corpus.includes(`₹${withComma}`) ||
    corpus.includes(`Rs.${compact}`) ||
    corpus.includes(`Rs. ${compact}`) ||
    corpus.includes(`INR ${compact}`)
  );
}

function corpusHasNumber(corpus: string, value: number, kind: 'multiplier' | 'percent'): boolean {
  const pattern = kind === 'multiplier' ? MULTIPLIER_IN_TEXT : PERCENT_IN_TEXT;
  for (const match of corpus.matchAll(pattern)) {
    const parsed = Number.parseFloat(match[1]!);
    if (Number.isFinite(parsed) && Math.abs(parsed - value) < 0.01) return true;
  }
  return false;
}

function extractPayloadMultiplier(payload: unknown): number | null {
  if (!payload || typeof payload !== 'object') return null;
  const row = payload as Record<string, unknown>;
  const value = row.rewardMultiplier ?? row.cashbackPercent ?? row.percent;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return null;
}

function extractPayloadPercent(payload: unknown): number | null {
  if (!payload || typeof payload !== 'object') return null;
  const row = payload as Record<string, unknown>;
  const value = row.cashbackPercent ?? row.percent;
  if (typeof value === 'number' && Number.isFinite(value) && !('rewardMultiplier' in row)) {
    return value;
  }
  return null;
}

/**
 * Ground fee/rate claims in an ingest bundle against fetched source text (HTML + PDF).
 * Ungrounded numeric rates are stripped from the returned bundle.
 */
export function groundIngestBundle(
  bundle: IngestCardBundle,
  sourceCorpus: string,
): { bundle: IngestCardBundle; grounding: BundleGroundingResult } {
  const corpus = sourceCorpus.replace(/\s+/g, ' ');
  const groundedClaims: GroundingClaim[] = [];
  const ungroundedClaims: GroundingClaim[] = [];
  const issues: BundleGroundingResult['issues'] = [];

  let annualFeeInr = bundle.annualFeeInr ?? null;
  let joiningFeeInr = bundle.joiningFeeInr ?? null;

  if (annualFeeInr != null) {
    const grounded = corpusHasAmount(corpus, annualFeeInr);
    const claim = { kind: 'annualFeeInr', value: annualFeeInr, grounded };
    (grounded ? groundedClaims : ungroundedClaims).push(claim);
    if (!grounded) {
      issues.push({
        code: 'UNGROUNDED_ANNUAL_FEE',
        message: `annualFeeInr ${annualFeeInr} not found in source text`,
      });
      annualFeeInr = null;
    }
  }

  if (joiningFeeInr != null) {
    const grounded = corpusHasAmount(corpus, joiningFeeInr);
    const claim = { kind: 'joiningFeeInr', value: joiningFeeInr, grounded };
    (grounded ? groundedClaims : ungroundedClaims).push(claim);
    if (!grounded) {
      issues.push({
        code: 'UNGROUNDED_JOINING_FEE',
        message: `joiningFeeInr ${joiningFeeInr} not found in source text`,
      });
      joiningFeeInr = null;
    }
  }

  const rewardRules = bundle.rewardRules.filter((rule) => {
    const multiplier = extractPayloadMultiplier(rule.payload);
    const percent = extractPayloadPercent(rule.payload);
    if (multiplier != null) {
      const grounded = corpusHasNumber(corpus, multiplier, 'multiplier');
      const claim = { kind: 'rewardMultiplier', value: multiplier, grounded };
      (grounded ? groundedClaims : ungroundedClaims).push(claim);
      if (!grounded) {
        issues.push({
          code: 'UNGROUNDED_REWARD_MULTIPLIER',
          message: `reward multiplier ${multiplier}x not found in source text`,
        });
        return false;
      }
      return true;
    }
    if (percent != null) {
      const grounded = corpusHasNumber(corpus, percent, 'percent');
      const claim = { kind: 'cashbackPercent', value: percent, grounded };
      (grounded ? groundedClaims : ungroundedClaims).push(claim);
      if (!grounded) {
        issues.push({
          code: 'UNGROUNDED_REWARD_PERCENT',
          message: `cashback percent ${percent}% not found in source text`,
        });
        return false;
      }
      return true;
    }
    groundedClaims.push({ kind: 'rewardRule', value: rule.ruleKey, grounded: true });
    return true;
  });

  const rewardText = [
    ...bundle.highlights.map((h) => `${h.title} ${h.description ?? ''}`),
    bundle.crawlDescription ?? '',
  ].join(' ');
  if (rewardRules.length === 0 && RATE_COPY.test(rewardText)) {
    issues.push({
      code: 'EMPTY_REWARDS_WITH_RATE_COPY',
      message: 'Page implies a reward rate but no grounded rewardRules remain',
    });
  }

  const totalClaims = groundedClaims.length + ungroundedClaims.length;
  const score =
    totalClaims === 0
      ? rewardRules.length === 0 && RATE_COPY.test(rewardText)
        ? 0.35
        : 0.75
      : groundedClaims.length / totalClaims;

  const critical = issues.some(
    (issue) =>
      issue.code === 'UNGROUNDED_REWARD_MULTIPLIER' ||
      issue.code === 'UNGROUNDED_REWARD_PERCENT' ||
      issue.code === 'EMPTY_REWARDS_WITH_RATE_COPY',
  );

  return {
    bundle: {
      ...bundle,
      annualFeeInr,
      joiningFeeInr,
      rewardRules,
    },
    grounding: {
      score: Math.round(score * 1000) / 1000,
      groundedClaims,
      ungroundedClaims,
      issues,
      critical,
    },
  };
}

export const AUTO_PUBLISH_GROUNDING_SCORE = 0.9;
