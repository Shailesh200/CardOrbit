import { z } from 'zod';

import {
  catalogAiIngestJob,
  catalogCrawlJob,
} from './catalog-jobs';
import {
  embeddingsBackfillJob,
} from './ai-jobs';
import { gmailStatementSyncJob } from './mail-jobs';
import type { JobDefinition } from './types';

export const JOB_REGISTRY = {
  [catalogAiIngestJob.type]: catalogAiIngestJob,
  [catalogCrawlJob.type]: catalogCrawlJob,
  [embeddingsBackfillJob.type]: embeddingsBackfillJob,
  [gmailStatementSyncJob.type]: gmailStatementSyncJob,
} as const;

export type JobType =
  | typeof catalogAiIngestJob.type
  | typeof catalogCrawlJob.type
  | typeof embeddingsBackfillJob.type
  | typeof gmailStatementSyncJob.type;

export const JobTypeSchema = z.enum([
  catalogAiIngestJob.type,
  catalogCrawlJob.type,
  embeddingsBackfillJob.type,
  gmailStatementSyncJob.type,
]);

export function getJobDefinition(type: string): JobDefinition<z.ZodTypeAny, unknown, unknown> | null {
  return (JOB_REGISTRY as Record<string, JobDefinition<z.ZodTypeAny, unknown, unknown>>)[type] ?? null;
}

export function parseJobPayload(type: string, payload: unknown): unknown {
  const def = getJobDefinition(type);
  if (!def) throw new Error(`Unknown job type: ${type}`);
  return def.payloadSchema.parse(payload);
}

export function listJobDefinitions() {
  return Object.values(JOB_REGISTRY).map((job) => ({
    type: job.type,
    queue: job.queue,
    description: job.description,
    estimatedMinutes: job.estimatedMinutes,
  }));
}
