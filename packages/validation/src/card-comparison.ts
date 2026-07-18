import { z } from 'zod';

export const MIN_COMPARISON_CARDS = 2;
export const MAX_COMPARISON_CARDS = 4;

export const CompareCardsInputSchema = z
  .object({
    userCardIds: z.array(z.string()).min(MIN_COMPARISON_CARDS).max(MAX_COMPARISON_CARDS).optional(),
    creditCardIds: z
      .array(z.string())
      .min(MIN_COMPARISON_CARDS)
      .max(MAX_COMPARISON_CARDS)
      .optional(),
  })
  .refine((value) => Boolean(value.userCardIds?.length) !== Boolean(value.creditCardIds?.length), {
    message: 'Provide either userCardIds or creditCardIds (exactly one)',
  })
  .refine(
    (value) =>
      (value.userCardIds?.length ?? 0) >= MIN_COMPARISON_CARDS ||
      (value.creditCardIds?.length ?? 0) >= MIN_COMPARISON_CARDS,
    { message: `Provide ${MIN_COMPARISON_CARDS}–${MAX_COMPARISON_CARDS} cards` },
  );

export type CompareCardsInput = z.infer<typeof CompareCardsInputSchema>;

export function parseCompareCardsInput(input: unknown): CompareCardsInput {
  return CompareCardsInputSchema.parse(input);
}

export const ComparisonColumnSchema = z.object({
  userCardId: z.string(),
  creditCardId: z.string(),
  cardName: z.string(),
  nickname: z.string().nullable(),
  bankName: z.string(),
  bankSlug: z.string(),
  cardSlug: z.string(),
  tier: z.string(),
  isFavorite: z.boolean(),
});

export type ComparisonColumn = z.infer<typeof ComparisonColumnSchema>;

export const ComparisonRowSchema = z.object({
  id: z.string(),
  group: z.enum(['fees', 'rewards', 'benefits', 'lifestyle']),
  label: z.string(),
  values: z.record(z.string(), z.string()),
  bestUserCardId: z.string().nullable(),
  highlight: z.enum(['lowest', 'highest', 'most']).nullable(),
  isDifferent: z.boolean(),
});

export type ComparisonRow = z.infer<typeof ComparisonRowSchema>;

export const CardComparisonResultSchema = z.object({
  columns: z.array(ComparisonColumnSchema),
  rows: z.array(ComparisonRowSchema),
  recommendedUserCardId: z.string().nullable(),
});

export type CardComparisonResult = z.infer<typeof CardComparisonResultSchema>;
