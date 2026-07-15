import { z } from 'zod';

export const OfferMatchStatusSchema = z.enum(['active', 'historical']);

export type OfferMatchStatus = z.infer<typeof OfferMatchStatusSchema>;

export const OfferMatchQuerySchema = z.object({
  merchantSlug: z.string().trim().min(1).max(160).optional(),
  amountInr: z.coerce.number().positive().max(10_000_000).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: OfferMatchStatusSchema.default('active'),
});

export type OfferMatchQuery = z.infer<typeof OfferMatchQuerySchema>;

export const MatchedOfferCardSchema = z.object({
  creditCardId: z.string().uuid(),
  cardSlug: z.string(),
  cardName: z.string(),
  bankName: z.string(),
  userCardId: z.string().nullable(),
  estimatedSavingsInr: z.number().nonnegative().nullable(),
});

export type MatchedOfferCard = z.infer<typeof MatchedOfferCardSchema>;

export const MatchedOfferMerchantSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
});

export type MatchedOfferMerchant = z.infer<typeof MatchedOfferMerchantSchema>;

export const MatchedOfferSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  type: z.enum(['MERCHANT', 'BANK', 'CARD']),
  cashbackPercent: z.string().nullable(),
  capInr: z.string().nullable(),
  termsSummary: z.string().nullable(),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime().nullable(),
  status: z.enum(['ACTIVE', 'SCHEDULED', 'EXPIRED', 'HISTORICAL']),
  merchants: z.array(MatchedOfferMerchantSchema),
  eligibleCards: z.array(MatchedOfferCardSchema),
  bestEstimatedSavingsInr: z.number().nonnegative().nullable(),
  isEligible: z.boolean(),
  ineligibilityReason: z.string().nullable(),
});

export type MatchedOffer = z.infer<typeof MatchedOfferSchema>;

export const OfferMatchResponseSchema = z.object({
  items: z.array(MatchedOfferSchema),
  total: z.number().int().nonnegative(),
  merchantSlug: z.string().nullable(),
  amountInr: z.number().positive().nullable(),
});

export type OfferMatchResponse = z.infer<typeof OfferMatchResponseSchema>;

export function parseOfferMatchQuery(input: unknown): OfferMatchQuery {
  return OfferMatchQuerySchema.parse(input);
}

export function computeOfferSavingsInr(
  amountInr: number,
  cashbackPercent: string | null | undefined,
  capInr: string | null | undefined,
): number | null {
  if (!cashbackPercent) return null;
  const rate = Number(cashbackPercent);
  if (!Number.isFinite(rate) || rate <= 0) return null;

  const raw = (amountInr * rate) / 100;
  const cap = capInr ? Number(capInr) : null;
  if (cap != null && Number.isFinite(cap) && cap >= 0) {
    return Math.min(raw, cap);
  }
  return raw;
}
