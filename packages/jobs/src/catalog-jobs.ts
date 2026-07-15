import { z } from 'zod';

import type { JobDefinition } from './types';

export const CatalogAiIngestPayloadSchema = z.object({
  bankSlug: z.string().min(1),
  purgePending: z.boolean().optional(),
  limit: z.number().int().positive().optional(),
});

export type CatalogAiIngestPayload = z.infer<typeof CatalogAiIngestPayloadSchema>;

export const CatalogCrawlPayloadSchema = z.object({
  bankSlug: z.string().min(1),
});

export type CatalogCrawlPayload = z.infer<typeof CatalogCrawlPayloadSchema>;

export const catalogAiIngestJob: JobDefinition<
  typeof CatalogAiIngestPayloadSchema,
  CatalogAiIngestProgress,
  CatalogAiIngestResult
> = {
  type: 'catalog.ai-ingest',
  queue: 'catalog',
  description: 'Fetch issuer pages, AI-structure card bundles, stage for admin review',
  estimatedMinutes: { min: 1, max: 60 },
  payloadSchema: CatalogAiIngestPayloadSchema,
  defaultPayload: { bankSlug: '', purgePending: true },
};

export const catalogCrawlJob: JobDefinition<
  typeof CatalogCrawlPayloadSchema,
  { message: string },
  { batchId: string; itemCount: number }
> = {
  type: 'catalog.crawl',
  queue: 'catalog',
  description: 'Rule-based crawl fallback for a bank catalog',
  estimatedMinutes: { min: 2, max: 15 },
  payloadSchema: CatalogCrawlPayloadSchema,
};

export type JobLogEntry = {
  at: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
};

export type CatalogAiIngestProgress = {
  done: number;
  total: number;
  currentUrl: string | null;
  itemCount: number;
  failedCount?: number;
  phase?: 'discovering' | 'fetching' | 'structuring' | 'staging' | 'waiting' | 'done';
  currentItemLabel?: string | null;
  lastStagedName?: string | null;
  bankSlug?: string;
  batchId?: string;
  message?: string;
  logs?: JobLogEntry[];
};

export type CatalogAiIngestResult = {
  batchId: string;
  itemCount: number;
  failedUrls: string[];
  purgedPending: number;
  cancelled?: boolean;
};
