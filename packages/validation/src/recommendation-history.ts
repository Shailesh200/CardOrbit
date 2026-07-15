import { z } from 'zod';

export const RecommendationFeedbackTypeSchema = z.enum([
  'USEFUL',
  'NOT_USEFUL',
  'WRONG_RECOMMENDATION',
  'MISSING_CARD',
  'INCORRECT_REWARD',
]);

export type RecommendationFeedbackType = z.infer<typeof RecommendationFeedbackTypeSchema>;

export const RecommendationSourceSchema = z.enum(['WEB', 'EXTENSION', 'DASHBOARD']);

export type RecommendationSource = z.infer<typeof RecommendationSourceSchema>;

export const RecommendationHistoryAlternativeSchema = z.object({
  userCardId: z.string(),
  creditCardId: z.string().uuid(),
  cardName: z.string(),
  cardSlug: z.string(),
  bankName: z.string(),
  rank: z.number().int().positive(),
  expectedRewardInr: z.number().nonnegative(),
  effectiveRatePercent: z.number().nonnegative(),
});

export type RecommendationHistoryAlternative = z.infer<
  typeof RecommendationHistoryAlternativeSchema
>;

export const RecommendationFeedbackSchema = z.object({
  type: RecommendationFeedbackTypeSchema,
  comment: z.string().trim().max(500).nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type RecommendationFeedback = z.infer<typeof RecommendationFeedbackSchema>;

export const RecommendationHistorySummarySchema = z.object({
  id: z.string().uuid(),
  amountInr: z.number().positive(),
  merchantSlug: z.string().nullable(),
  merchantName: z.string().nullable(),
  recommendedCardName: z.string().nullable(),
  expectedRewardInr: z.number().nonnegative().nullable(),
  rankingVersion: z.enum(['v1', 'v2', 'v3']),
  source: RecommendationSourceSchema,
  createdAt: z.string().datetime(),
  feedback: RecommendationFeedbackSchema.pick({ type: true, updatedAt: true }).nullable(),
});

export type RecommendationHistorySummary = z.infer<typeof RecommendationHistorySummarySchema>;

export const RecommendationHistoryDetailSchema = RecommendationHistorySummarySchema.extend({
  categorySlug: z.string().nullable(),
  effectiveRatePercent: z.number().nonnegative().nullable(),
  confidenceScore: z.number().nonnegative().nullable(),
  explanationSource: z.enum(['ai', 'template']),
  explanation: z.string().nullable(),
  alternatives: z.array(RecommendationHistoryAlternativeSchema),
  cardsEvaluated: z.number().int().nonnegative(),
  feedback: RecommendationFeedbackSchema.nullable(),
});

export type RecommendationHistoryDetail = z.infer<typeof RecommendationHistoryDetailSchema>;

export const ListRecommendationHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type ListRecommendationHistoryQuery = z.infer<typeof ListRecommendationHistoryQuerySchema>;

export const SubmitRecommendationFeedbackSchema = z.object({
  type: RecommendationFeedbackTypeSchema,
  comment: z.string().trim().max(500).optional(),
});

export type SubmitRecommendationFeedbackInput = z.infer<typeof SubmitRecommendationFeedbackSchema>;

export function parseListRecommendationHistoryQuery(
  input: unknown,
): ListRecommendationHistoryQuery {
  return ListRecommendationHistoryQuerySchema.parse(input);
}

export function parseSubmitRecommendationFeedbackInput(
  input: unknown,
): SubmitRecommendationFeedbackInput {
  return SubmitRecommendationFeedbackSchema.parse(input);
}

export function parseRecommendationSource(input: unknown): RecommendationSource {
  return RecommendationSourceSchema.parse(input);
}
