import { z } from 'zod';

import { SearchEntityTypeSchema } from './semantic-search';

export const RagCitationSchema = z.object({
  entityType: SearchEntityTypeSchema,
  id: z.string().uuid(),
  slug: z.string(),
  label: z.string(),
});

export type RagCitation = z.infer<typeof RagCitationSchema>;

export const RagChunkSchema = z.object({
  id: z.string(),
  entityType: SearchEntityTypeSchema,
  slug: z.string(),
  title: z.string(),
  excerpt: z.string(),
  score: z.number().min(0).max(1),
  citation: RagCitationSchema,
});

export type RagChunk = z.infer<typeof RagChunkSchema>;

export const UserPortfolioCardContextSchema = z.object({
  slug: z.string(),
  name: z.string(),
  bankSlug: z.string(),
  tier: z.string(),
  isFavorite: z.boolean(),
  benefitHighlights: z.array(z.string()).max(5),
});

export type UserPortfolioCardContext = z.infer<typeof UserPortfolioCardContextSchema>;

export const UserAiContextSchema = z.object({
  preferredRewardType: z.string(),
  preferredCategorySlugs: z.array(z.string()),
  boostFavoriteCards: z.boolean(),
  portfolioCount: z.number().int().nonnegative(),
  favoriteCount: z.number().int().nonnegative(),
  portfolioCards: z.array(UserPortfolioCardContextSchema).max(20),
});

export type UserAiContext = z.infer<typeof UserAiContextSchema>;

export const RagRetrievalRequestSchema = z.object({
  q: z.string().trim().min(1).max(500),
  types: z.array(SearchEntityTypeSchema).min(1).max(2).optional(),
  limit: z.number().int().min(1).max(12).optional(),
});

export type RagRetrievalRequest = z.infer<typeof RagRetrievalRequestSchema>;

export const RagRetrievalResponseSchema = z.object({
  query: z.string(),
  source: z.enum(['semantic', 'keyword']),
  userContext: UserAiContextSchema,
  chunks: z.array(RagChunkSchema),
});

export type RagRetrievalResponse = z.infer<typeof RagRetrievalResponseSchema>;

export const RagAnswerRequestSchema = RagRetrievalRequestSchema;

export type RagAnswerRequest = z.infer<typeof RagAnswerRequestSchema>;

export const RagAnswerOutputSchema = z.object({
  answer: z.string().min(1).max(2000),
  citations: z.array(RagCitationSchema).max(8),
  confidence: z.enum(['high', 'medium', 'low']),
});

export type RagAnswerOutput = z.infer<typeof RagAnswerOutputSchema>;

export const RagAnswerResponseSchema = RagRetrievalResponseSchema.extend({
  answer: RagAnswerOutputSchema,
});

export type RagAnswerResponse = z.infer<typeof RagAnswerResponseSchema>;

export function parseRagRetrievalRequest(input: unknown): RagRetrievalRequest {
  return RagRetrievalRequestSchema.parse(input);
}

export function parseRagAnswerRequest(input: unknown): RagAnswerRequest {
  return RagAnswerRequestSchema.parse(input);
}
