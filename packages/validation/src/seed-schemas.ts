import { z } from 'zod';

import { RewardRulePayloadSchema } from './reward-rule-payload';

const slug = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const nonEmpty = z.string().min(1);
/** ISO date (`YYYY-MM-DD`) or datetime string. */
const isoDate = z.string().min(4);

export const SeedNetworkSchema = z.object({
  code: nonEmpty,
  name: nonEmpty,
  slug,
});

export const SeedBankSchema = z.object({
  name: nonEmpty,
  slug,
  country: z.string().length(2).default('IN'),
  logoUrl: z.string().url().optional().nullable(),
});

export const SeedBanksFileSchema = z.object({
  networks: z.array(SeedNetworkSchema).min(1),
  banks: z.array(SeedBankSchema).min(1),
});

export const SeedRewardProgramSchema = z.object({
  name: nonEmpty,
  slug,
  issuerBankSlug: slug.optional().nullable(),
  pointValueInr: z.number().nonnegative().optional().nullable(),
});

export const SeedSpendCategorySchema = z.object({
  code: nonEmpty,
  name: nonEmpty,
  slug,
  description: z.string().optional().nullable(),
});

export const SeedCardSchema = z.object({
  name: nonEmpty,
  slug,
  bankSlug: slug,
  networkCode: nonEmpty,
  rewardProgramSlug: slug.optional().nullable(),
  tier: z
    .enum(['ENTRY', 'STANDARD', 'PREMIUM', 'SUPER_PREMIUM', 'ULTRA_PREMIUM'])
    .default('STANDARD'),
  active: z.boolean().default(true),
  annualFeeInr: z.number().nonnegative().optional().nullable(),
  joiningFeeInr: z.number().nonnegative().optional().nullable(),
});

export const SeedCardsFileSchema = z.object({
  rewardPrograms: z.array(SeedRewardProgramSchema).min(1),
  spendCategories: z.array(SeedSpendCategorySchema).min(1),
  cards: z.array(SeedCardSchema).default([]),
});

export const SeedMerchantCategorySchema = z.object({
  code: nonEmpty,
  name: nonEmpty,
  slug,
  description: z.string().optional().nullable(),
});

export const SeedMerchantSchema = z.object({
  name: nonEmpty,
  slug,
  primaryCategoryCode: nonEmpty.optional().nullable(),
  aliases: z.array(nonEmpty).default([]),
  paymentMethods: z.array(nonEmpty).default(['CARD']),
  active: z.boolean().default(true),
  website: z.string().url().optional().nullable(),
  brandName: nonEmpty.optional().nullable(),
  parentBrand: nonEmpty.optional().nullable(),
  popularityScore: z.number().int().min(0).max(100).optional(),
  tags: z.array(nonEmpty).default([]),
});

export const SeedMccMappingSchema = z.object({
  mccCode: z.string().regex(/^\d{4}$/),
  categoryCode: nonEmpty,
  description: z.string().optional().nullable(),
});

export const SeedMerchantsFileSchema = z.object({
  categories: z.array(SeedMerchantCategorySchema).min(1),
  merchants: z.array(SeedMerchantSchema).default([]),
  mccMappings: z.array(SeedMccMappingSchema).default([]),
});

export const SeedRewardRuleSchema = z.object({
  ruleKey: nonEmpty,
  name: nonEmpty,
  cardSlug: slug,
  rewardProgramSlug: slug.optional().nullable(),
  spendCategoryCode: nonEmpty.optional().nullable(),
  merchantSlug: slug.optional().nullable(),
  payload: RewardRulePayloadSchema,
  validFrom: isoDate,
  validUntil: isoDate.nullable().optional(),
});

export const SeedRewardRulesFileSchema = z.object({
  rules: z.array(SeedRewardRuleSchema).default([]),
});

export const SeedOfferSchema = z.object({
  code: nonEmpty,
  slug,
  title: nonEmpty,
  description: z.string().optional().nullable(),
  type: z.enum(['MERCHANT', 'BANK', 'CARD']),
  issuerBankSlug: slug.optional().nullable(),
  cashbackPercent: z.number().min(0).max(100).optional().nullable(),
  capInr: z.number().nonnegative().optional().nullable(),
  termsSummary: z.string().optional().nullable(),
  validFrom: isoDate,
  validUntil: isoDate.nullable().optional(),
  status: z.enum(['ACTIVE', 'SCHEDULED', 'EXPIRED', 'HISTORICAL']).default('ACTIVE'),
  cardSlugs: z.array(slug).default([]),
  merchantSlugs: z.array(slug).default([]),
});

export const SeedOffersFileSchema = z.object({
  offers: z.array(SeedOfferSchema).default([]),
});

export type SeedBanksFile = z.infer<typeof SeedBanksFileSchema>;
export type SeedCardsFile = z.infer<typeof SeedCardsFileSchema>;
export type SeedMerchantsFile = z.infer<typeof SeedMerchantsFileSchema>;
export type SeedRewardRulesFile = z.infer<typeof SeedRewardRulesFileSchema>;
export type SeedOffersFile = z.infer<typeof SeedOffersFileSchema>;

export function parseSeedBanksFile(input: unknown): SeedBanksFile {
  return SeedBanksFileSchema.parse(input);
}

export function parseSeedCardsFile(input: unknown): SeedCardsFile {
  return SeedCardsFileSchema.parse(input);
}

export function parseSeedMerchantsFile(input: unknown): SeedMerchantsFile {
  return SeedMerchantsFileSchema.parse(input);
}

export function parseSeedRewardRulesFile(input: unknown): SeedRewardRulesFile {
  return SeedRewardRulesFileSchema.parse(input);
}

export function parseSeedOffersFile(input: unknown): SeedOffersFile {
  return SeedOffersFileSchema.parse(input);
}
