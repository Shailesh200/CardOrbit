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
  annualFeeInr: z.number().nonnegative().nullable().optional(),
  joiningFeeInr: z.number().nonnegative().nullable().optional(),
  approvalSummary: z.string().nullable().optional(),
  eligibilitySummary: z.string().nullable().optional(),
});

export type CatalogAiDraft = z.infer<typeof CatalogAiDraftSchema>;

export function draftToIngestBundle(
  draft: CatalogAiDraft,
  input: { bankSlug: string; sourceUrl: string },
): IngestCardBundle {
  const slug = draft.slug.startsWith(`${input.bankSlug}-`)
    ? draft.slug
    : `${input.bankSlug}-${draft.slug.replace(/^idfc-first-/, '')}`;

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
    highlights: draft.highlights.map((h) => ({
      ...h,
      sourceUrl: input.sourceUrl,
    })),
    benefits: draft.highlights.map((h) => ({
      benefitTypeCode: h.category,
      title: h.title,
      description: h.description ?? null,
      sourceUrl: input.sourceUrl,
    })),
    rewardRules: [],
    approvalSummary: draft.approvalSummary ?? null,
    eligibilitySummary: draft.eligibilitySummary ?? null,
    crawlDescription: null,
    feesSummary: null,
  };
}
