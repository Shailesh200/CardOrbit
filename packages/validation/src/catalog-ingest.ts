import { z } from 'zod';

import { RewardRulePayloadSchema } from './reward-rule-payload';

const slug = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const nonEmpty = z.string().min(1);
const url = z.string().url();

export const IngestBenefitSchema = z.object({
  benefitTypeCode: nonEmpty,
  title: nonEmpty,
  description: z.string().optional().nullable(),
  sourceUrl: url.optional().nullable(),
});

export const IngestFeeKindSchema = z.enum([
  'JOINING',
  'ANNUAL',
  'APR',
  'FOREX',
  'CASH_ADVANCE',
  'LATE_PAYMENT',
  'REWARD_REDEMPTION',
  'OTHER',
]);

export const IngestStructuredFeeSchema = z.object({
  feeKind: IngestFeeKindSchema,
  label: nonEmpty,
  value: nonEmpty,
});

export const IngestCardHighlightSchema = z.object({
  category: nonEmpty,
  title: nonEmpty,
  description: z.string().optional().nullable(),
  sourceUrl: url.optional().nullable(),
});

export const IngestRewardRuleSchema = z.object({
  ruleKey: nonEmpty,
  name: nonEmpty,
  spendCategoryCode: nonEmpty.optional().nullable(),
  merchantSlug: slug.optional().nullable(),
  payload: RewardRulePayloadSchema,
  validFrom: z.string().min(4),
  validUntil: z.string().min(4).nullable().optional(),
  sourceUrl: url.optional().nullable(),
});

export const IngestCardBundleSchema = z.object({
  bankSlug: slug,
  bankSourceUrl: url.optional().nullable(),
  name: nonEmpty,
  slug,
  sourceUrl: url,
  networkCode: z.enum(['VISA', 'MASTERCARD', 'RUPAY', 'AMEX']),
  tier: z
    .enum(['ENTRY', 'STANDARD', 'PREMIUM', 'SUPER_PREMIUM', 'ULTRA_PREMIUM'])
    .default('STANDARD'),
  annualFeeInr: z.number().nonnegative().optional().nullable(),
  joiningFeeInr: z.number().nonnegative().optional().nullable(),
  rewardProgramSlug: slug.optional().nullable(),
  pointValueInr: z.number().nonnegative().optional().nullable(),
  benefits: z.array(IngestBenefitSchema).default([]),
  rewardRules: z.array(IngestRewardRuleSchema).default([]),
  /** Product tags surfaced in admin review (e.g. Lifetime free, Metal card). */
  tags: z.array(nonEmpty).default([]),
  /** Parsed fee rows from issuer fees & charges section. */
  structuredFees: z.array(IngestStructuredFeeSchema).default([]),
  /** Categorized card highlights extracted from issuer product page. */
  highlights: z.array(IngestCardHighlightSchema).default([]),
  approvalSummary: z.string().optional().nullable(),
  eligibilitySummary: z.string().optional().nullable(),
  /** Crawled issuer description — shown in admin review, not persisted on publish. */
  crawlDescription: z.string().optional().nullable(),
  /** Crawled fees/charges summary — shown in admin review, not persisted on publish. */
  feesSummary: z.string().optional().nullable(),
});

export const IngestMerchantUpsertSchema = z.object({
  name: nonEmpty,
  slug,
  primaryCategoryCode: nonEmpty.optional().nullable(),
  website: url.optional().nullable(),
  sourceUrl: url.optional().nullable(),
  brandName: nonEmpty.optional().nullable(),
  parentBrand: nonEmpty.optional().nullable(),
  popularityScore: z.number().int().min(0).max(100).optional(),
  tags: z.array(nonEmpty).default([]),
  aliases: z.array(nonEmpty).default([]),
  active: z.boolean().default(true),
});

export const IngestMerchantRemoveSchema = z.object({
  slug,
  reason: z.string().optional().nullable(),
});

export type IngestCardBundle = z.infer<typeof IngestCardBundleSchema>;
export type IngestMerchantUpsert = z.infer<typeof IngestMerchantUpsertSchema>;
export type IngestMerchantRemove = z.infer<typeof IngestMerchantRemoveSchema>;

export function parseIngestCardBundle(input: unknown): IngestCardBundle {
  return IngestCardBundleSchema.parse(input);
}

export function parseIngestMerchantUpsert(input: unknown): IngestMerchantUpsert {
  return IngestMerchantUpsertSchema.parse(input);
}

export function parseIngestMerchantRemove(input: unknown): IngestMerchantRemove {
  return IngestMerchantRemoveSchema.parse(input);
}

export const CatalogImportIngestMetaSchema = z.object({
  method: z.enum(['ai', 'crawl', 'ai+fallback', 'fallback']),
  model: z.string().optional(),
  promptVersion: z.string().optional(),
  latencyMs: z.number().int().nonnegative().optional(),
  fallbackBundle: IngestCardBundleSchema.optional(),
});

export type CatalogImportIngestMeta = z.infer<typeof CatalogImportIngestMetaSchema>;

export const CatalogImportCardPayloadSchema = z.union([
  IngestCardBundleSchema,
  z.object({
    bundle: IngestCardBundleSchema,
    ingestMeta: CatalogImportIngestMetaSchema,
  }),
]);

export type CatalogImportCardPayload = z.infer<typeof CatalogImportCardPayloadSchema>;

export function parseCatalogImportCardPayload(input: unknown): CatalogImportCardPayload {
  return CatalogImportCardPayloadSchema.parse(input);
}

export function extractIngestCardBundle(input: unknown): IngestCardBundle {
  const parsed = parseCatalogImportCardPayload(input);
  if (typeof parsed === 'object' && parsed !== null && 'bundle' in parsed) {
    return parsed.bundle;
  }
  return parsed;
}

export function extractCatalogImportIngestMeta(input: unknown): CatalogImportIngestMeta | null {
  const parsed = parseCatalogImportCardPayload(input);
  if (typeof parsed === 'object' && parsed !== null && 'ingestMeta' in parsed) {
    return parsed.ingestMeta;
  }
  return null;
}
