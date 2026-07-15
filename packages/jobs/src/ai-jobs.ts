import { z } from 'zod';

import type { JobDefinition } from './types';

export const EmbeddingsBackfillPayloadSchema = z.object({
  entityTypes: z.array(z.enum(['card', 'merchant'])).min(1).max(2).optional(),
  force: z.boolean().optional(),
  limit: z.number().int().positive().optional(),
});

export type EmbeddingsBackfillPayload = z.infer<typeof EmbeddingsBackfillPayloadSchema>;

export type EmbeddingsBackfillProgress = {
  done: number;
  total: number;
  indexed: number;
  skipped: number;
  failed: number;
  currentLabel?: string | null;
  message?: string;
};

export type EmbeddingsBackfillResult = {
  indexed: number;
  skipped: number;
  failed: number;
  model: string;
};

export const embeddingsBackfillJob: JobDefinition<
  typeof EmbeddingsBackfillPayloadSchema,
  EmbeddingsBackfillProgress,
  EmbeddingsBackfillResult
> = {
  type: 'ai.embeddings-backfill',
  queue: 'ai',
  description: 'Generate and store card/merchant embeddings for semantic search',
  estimatedMinutes: { min: 1, max: 20 },
  payloadSchema: EmbeddingsBackfillPayloadSchema,
  defaultPayload: { entityTypes: ['card', 'merchant'], force: false },
};
