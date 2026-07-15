import {
  RagAnswerOutputSchema,
  SearchEntityTypeSchema,
  type RagAnswerOutput,
  type UserAiContext,
} from '@cardwise/validation';
import { z } from 'zod';

import { buildRagAnswerPrompt, RAG_ANSWER_SYSTEM } from '../prompts/rag-answer';
import { getPromptVersion } from '../prompts/registry';
import { generateStructured, type StructuredResult } from '../structured';

const RagAnswerModelOutputSchema = z.object({
  answer: z.string().min(1).max(2000),
  citations: z
    .array(
      z.object({
        entityType: SearchEntityTypeSchema,
        id: z.string().optional(),
        slug: z.string(),
        label: z.string(),
      }),
    )
    .max(8),
  confidence: z.enum(['high', 'medium', 'low']),
});

function normalizeRagAnswer(
  raw: z.infer<typeof RagAnswerModelOutputSchema>,
  chunks: Array<{ slug: string; citation: RagAnswerOutput['citations'][number] }>,
): RagAnswerOutput {
  const bySlug = new Map(chunks.map((chunk) => [chunk.slug, chunk.citation]));
  const citations: RagAnswerOutput['citations'] = [];

  for (const citation of raw.citations) {
    const known = bySlug.get(citation.slug);
    if (known) citations.push(known);
  }

  if (citations.length === 0) {
    citations.push(...chunks.slice(0, 3).map((chunk) => chunk.citation));
  }

  return RagAnswerOutputSchema.parse({
    answer: raw.answer,
    citations,
    confidence: raw.confidence,
  });
}

export async function generateRagAnswer(input: {
  question: string;
  userContext: UserAiContext;
  chunks: Array<{ title: string; excerpt: string; slug: string; entityType: string; citation: { id: string; slug: string; label: string; entityType: 'card' | 'merchant' } }>;
}): Promise<StructuredResult<RagAnswerOutput>> {
  const prompt = buildRagAnswerPrompt({
    question: input.question,
    userContext: input.userContext,
    chunks: input.chunks.map((chunk) => ({
      id: chunk.citation.id,
      title: chunk.title,
      excerpt: chunk.excerpt,
      slug: chunk.slug,
      entityType: chunk.entityType,
    })),
  });

  const result = await generateStructured({
    schema: RagAnswerModelOutputSchema,
    system: RAG_ANSWER_SYSTEM,
    prompt,
    tier: 'quality',
    maxOutputTokens: 1024,
    feature: 'rag-answer',
    promptVersion: getPromptVersion('rag-answer'),
  });

  return {
    ...result,
    data: normalizeRagAnswer(result.data, input.chunks),
  };
}
