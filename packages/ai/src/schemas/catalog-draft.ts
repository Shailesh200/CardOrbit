import { z } from 'zod';

import type { IngestCardBundle } from '@cardwise/validation';

const FeeKindSchema = z.enum([
  'JOINING',
  'ANNUAL',
  'APR',
  'FOREX',
  'CASH_ADVANCE',
  'LATE_PAYMENT',
  'REWARD_REDEMPTION',
  'OTHER',
]);

/** Smaller schema for free-tier models — mapped to IngestCardBundle after generation. */
export const CatalogAiDraftSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  networkCode: z.enum(['VISA', 'MASTERCARD', 'RUPAY', 'AMEX']),
  tier: z.enum(['ENTRY', 'STANDARD', 'PREMIUM', 'SUPER_PREMIUM', 'ULTRA_PREMIUM']).default('STANDARD'),
  tags: z.array(z.string()).default([]),
  highlights: z
    .array(
      z.object({
        category: z.string().min(1),
        title: z.string().min(1),
        description: z.string().nullable().optional(),
      }),
    )
    .default([]),
  structuredFees: z
    .array(
      z.object({
        feeKind: FeeKindSchema,
        label: z.string().min(1),
        value: z.string().min(1),
      }),
    )
    .default([]),
  /** Compact earn-rate draft — only emitted when the page states a clear numeric rate. */
  rewardRules: z
    .array(
      z.object({
        ruleKey: z.string().min(1),
        name: z.string().min(1),
        spendCategoryCode: z.string().min(1).nullable().optional(),
        rewardMultiplier: z.number().positive().nullable().optional(),
        cashbackPercent: z.number().min(0).max(100).nullable().optional(),
        perTransactionCap: z.number().nonnegative().nullable().optional(),
        monthlyLimit: z.number().nonnegative().nullable().optional(),
      }),
    )
    .default([]),
  annualFeeInr: z.number().nonnegative().nullable().optional(),
  joiningFeeInr: z.number().nonnegative().nullable().optional(),
  approvalSummary: z.string().nullable().optional(),
  eligibilitySummary: z.string().nullable().optional(),
});

export type CatalogAiDraft = z.infer<typeof CatalogAiDraftSchema>;
type CatalogAiDraftRewardRule = CatalogAiDraft['rewardRules'][number];
type IngestHighlight = IngestCardBundle['highlights'][number];
type IngestRewardRule = IngestCardBundle['rewardRules'][number];

const REWARD_HIGHLIGHT_CATEGORIES = new Set(['REWARDS', 'CASHBACK', 'MILESTONE', 'WELCOME']);
/** Matches an explicit multiplier like "5X" or "4x reward points" — never inferred from vague text. */
const MULTIPLIER_PATTERN = /(\d+(?:\.\d+)?)\s*[xX]\b/;
/** Matches "1% cashback" / "up to 2.5% cash back" style statements. */
const CASHBACK_PATTERN = /(\d+(?:\.\d+)?)\s*%\s*cash\s*-?\s*back/i;

function slugifyRuleKey(cardSlug: string, title: string): string {
  const segment = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return `${cardSlug}-${segment || 'reward-rule'}`;
}

/**
 * Best-effort earn-rate extraction from a highlight when the model did not emit a
 * structured rewardRules entry. Conservative on purpose: only fires on an explicit
 * "NX" multiplier or "N% cashback" string, otherwise returns null (never invents a rate).
 */
function deriveRewardRuleFromHighlight(
  highlight: IngestHighlight,
  ctx: { slug: string; sourceUrl: string },
): IngestRewardRule | null {
  if (!REWARD_HIGHLIGHT_CATEGORIES.has(highlight.category.toUpperCase())) return null;

  const text = `${highlight.title} ${highlight.description ?? ''}`;
  const cashbackMatch = text.match(CASHBACK_PATTERN);
  const multiplierMatch = !cashbackMatch ? text.match(MULTIPLIER_PATTERN) : null;

  const cashbackPercent = cashbackMatch ? Number(cashbackMatch[1]) : undefined;
  const rewardMultiplier = multiplierMatch ? Number(multiplierMatch[1]) : undefined;
  if (cashbackPercent === undefined && rewardMultiplier === undefined) return null;

  return {
    ruleKey: slugifyRuleKey(ctx.slug, highlight.title),
    name: highlight.title,
    spendCategoryCode: null,
    merchantSlug: null,
    payload: {
      ...(rewardMultiplier !== undefined ? { rewardMultiplier } : {}),
      ...(cashbackPercent !== undefined ? { cashbackPercent } : {}),
      exclusions: [],
    },
    validFrom: '2026-01-01',
    validUntil: null,
    sourceUrl: highlight.sourceUrl ?? ctx.sourceUrl,
  };
}

function draftRuleToIngestRule(
  rule: CatalogAiDraftRewardRule,
  ctx: { slug: string; sourceUrl: string },
): IngestRewardRule | null {
  if (rule.rewardMultiplier == null && rule.cashbackPercent == null) return null;

  return {
    ruleKey: rule.ruleKey.startsWith(ctx.slug) ? rule.ruleKey : `${ctx.slug}-${rule.ruleKey}`,
    name: rule.name,
    spendCategoryCode: rule.spendCategoryCode ?? null,
    merchantSlug: null,
    payload: {
      ...(rule.rewardMultiplier != null ? { rewardMultiplier: rule.rewardMultiplier } : {}),
      ...(rule.cashbackPercent != null ? { cashbackPercent: rule.cashbackPercent } : {}),
      ...(rule.perTransactionCap != null ? { perTransactionCap: rule.perTransactionCap } : {}),
      ...(rule.monthlyLimit != null ? { monthlyLimit: rule.monthlyLimit } : {}),
      exclusions: [],
    },
    validFrom: '2026-01-01',
    validUntil: null,
    sourceUrl: ctx.sourceUrl,
  };
}

function resolveRewardRules(
  draft: CatalogAiDraft,
  highlights: IngestCardBundle['highlights'],
  ctx: { slug: string; sourceUrl: string },
): IngestRewardRule[] {
  const fromDraft = draft.rewardRules
    .map((rule) => draftRuleToIngestRule(rule, ctx))
    .filter((rule): rule is IngestRewardRule => rule !== null);
  if (fromDraft.length > 0) return fromDraft;

  const seen = new Set<string>();
  const derived: IngestRewardRule[] = [];
  for (const highlight of highlights) {
    const rule = deriveRewardRuleFromHighlight(highlight, ctx);
    if (!rule || seen.has(rule.ruleKey)) continue;
    seen.add(rule.ruleKey);
    derived.push(rule);
  }
  return derived;
}

export function draftToIngestBundle(
  draft: CatalogAiDraft,
  input: { bankSlug: string; sourceUrl: string },
): IngestCardBundle {
  const slug = draft.slug.startsWith(`${input.bankSlug}-`)
    ? draft.slug
    : `${input.bankSlug}-${draft.slug.replace(/^idfc-first-/, '')}`;

  const highlights = draft.highlights.map((h) => ({
    ...h,
    sourceUrl: input.sourceUrl,
  }));

  return {
    bankSlug: input.bankSlug,
    bankSourceUrl: null,
    name: draft.name,
    slug,
    sourceUrl: input.sourceUrl,
    networkCode: draft.networkCode,
    tier: draft.tier,
    annualFeeInr: draft.annualFeeInr ?? null,
    joiningFeeInr: draft.joiningFeeInr ?? null,
    rewardProgramSlug: null,
    pointValueInr: null,
    tags: draft.tags,
    structuredFees: draft.structuredFees,
    highlights,
    benefits: draft.highlights.map((h) => ({
      benefitTypeCode: h.category,
      title: h.title,
      description: h.description ?? null,
      sourceUrl: input.sourceUrl,
    })),
    rewardRules: resolveRewardRules(draft, highlights, { slug, sourceUrl: input.sourceUrl }),
    approvalSummary: draft.approvalSummary ?? null,
    eligibilitySummary: draft.eligibilitySummary ?? null,
    crawlDescription: null,
    feesSummary: null,
    sourceDocuments: [],
  };
}
