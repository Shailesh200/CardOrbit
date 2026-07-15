import { Worker, type Job } from 'bullmq';
import { PrismaClient, JobRunStatus, type Prisma } from '@prisma/client';
import { isAiConfigured } from '@cardwise/ai';
import {
  applyFeatureFlagDefinitions,
  initFeatureFlags,
  isEnabled,
  FeatureFlag,
} from '@cardwise/feature-flags';
import {
  catalogAiIngestJob,
  catalogCrawlJob,
  embeddingsBackfillJob,
  gmailStatementSyncJob,
  jobChannel,
  type JobProgressEvent,
  type CatalogAiIngestPayload,
  type CatalogCrawlPayload,
  type EmbeddingsBackfillPayload,
  type GmailStatementSyncPayload,
} from '@cardwise/jobs';
import {
  runCatalogAiIngest,
  runCatalogCrawl,
  runEmbeddingsBackfill,
  runGmailStatementSync,
  JobCancelledError,
} from '@cardwise/job-runners';
import Redis from 'ioredis';
import { v7 as uuidv7 } from 'uuid';

import { resolveAiExecConfig } from './ai-config';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const FLAG_REFRESH_MS = 30_000;
const redisUrl = new URL(REDIS_URL);
const bullConnection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  maxRetriesPerRequest: null as null,
};

const prisma = new PrismaClient();
const publisher = new Redis(REDIS_URL, { maxRetriesPerRequest: null });

async function refreshFeatureFlagsFromDb(): Promise<void> {
  const rows = await prisma.featureFlagDefinition.findMany({
    select: { key: true, enabled: true, rolloutPercentage: true },
  });
  applyFeatureFlagDefinitions(rows);
}

type JobPayload = {
  jobRunId: string;
  type: string;
  payload: unknown;
  triggeredBy?: string;
};

async function publishEvent(event: JobProgressEvent): Promise<void> {
  await publisher.publish(jobChannel(event.jobId), JSON.stringify(event));
}

async function updateJobRun(
  jobRunId: string,
  data: {
    status?: JobRunStatus;
    progress?: Record<string, unknown> | null;
    result?: Record<string, unknown> | null;
    errorMessage?: string | null;
    startedAt?: Date;
    completedAt?: Date;
  },
): Promise<void> {
  await prisma.jobRun.update({
    where: { id: jobRunId },
    data: {
      ...(data.status ? { status: data.status } : {}),
      ...(data.progress !== undefined
        ? { progress: (data.progress ?? undefined) as Prisma.InputJsonValue | undefined }
        : {}),
      ...(data.result !== undefined
        ? { result: (data.result ?? undefined) as Prisma.InputJsonValue | undefined }
        : {}),
      ...(data.errorMessage !== undefined ? { errorMessage: data.errorMessage } : {}),
      ...(data.startedAt ? { startedAt: data.startedAt } : {}),
      ...(data.completedAt ? { completedAt: data.completedAt } : {}),
    },
  });
}

async function processCatalogAiIngest(job: Job<JobPayload>): Promise<void> {
  const { jobRunId, payload, triggeredBy } = job.data;
  const typed = payload as CatalogAiIngestPayload;

  if (!isAiConfigured()) {
    throw new Error('AI is not configured');
  }
  if (!(await isEnabled(FeatureFlag.AI_CATALOG_STRUCTURING_ENABLED))) {
    throw new Error('AI catalog structuring is disabled — enable it in Admin → Feature flags');
  }

  const execConfig = await resolveAiExecConfig(prisma);
  const startedAt = new Date();

  await updateJobRun(jobRunId, { status: JobRunStatus.PROCESSING, startedAt });
  await publishEvent({ jobId: jobRunId, status: 'PROCESSING', progress: { message: 'Starting AI ingest' } });

  const result = await runCatalogAiIngest(prisma, typed, {
    triggeredBy,
    jobRunId,
    newUuidV7: uuidv7,
    execConfig,
    onProgress: async (progress) => {
      await updateJobRun(jobRunId, { progress: progress as Record<string, unknown> });
      await publishEvent({ jobId: jobRunId, status: 'PROCESSING', progress: progress as Record<string, unknown> });
    },
  });

  const cancelled = Boolean(result.cancelled);
  await updateJobRun(jobRunId, {
    status: cancelled ? JobRunStatus.CANCELLED : JobRunStatus.COMPLETED,
    result: result as Record<string, unknown>,
    errorMessage: cancelled ? 'Cancelled by operator' : null,
    completedAt: new Date(),
  });
  await publishEvent({
    jobId: jobRunId,
    status: cancelled ? 'CANCELLED' : 'COMPLETED',
    result: result as Record<string, unknown>,
    errorMessage: cancelled ? 'Cancelled by operator' : undefined,
  });
}

async function processCatalogCrawl(job: Job<JobPayload>): Promise<void> {
  const { jobRunId, payload } = job.data;
  const typed = payload as CatalogCrawlPayload;
  const startedAt = new Date();

  await updateJobRun(jobRunId, { status: JobRunStatus.PROCESSING, startedAt });
  await publishEvent({ jobId: jobRunId, status: 'PROCESSING', progress: { message: 'Crawling bank catalog' } });

  const result = await runCatalogCrawl(prisma, typed, uuidv7);

  await updateJobRun(jobRunId, {
    status: JobRunStatus.COMPLETED,
    result: result as Record<string, unknown>,
    completedAt: new Date(),
  });
  await publishEvent({
    jobId: jobRunId,
    status: 'COMPLETED',
    result: result as Record<string, unknown>,
  });
}

async function processEmbeddingsBackfill(job: Job<JobPayload>): Promise<void> {
  const { jobRunId, payload } = job.data;
  const typed = payload as EmbeddingsBackfillPayload;
  const startedAt = new Date();

  if (!isAiConfigured()) {
    throw new Error('AI is not configured');
  }
  if (!(await isEnabled(FeatureFlag.AI_SEARCH_ENABLED))) {
    throw new Error('AI semantic search is disabled — enable it in Admin → Feature flags');
  }

  await updateJobRun(jobRunId, { status: JobRunStatus.PROCESSING, startedAt });
  await publishEvent({
    jobId: jobRunId,
    status: 'PROCESSING',
    progress: { message: 'Starting embeddings backfill' },
  });

  const result = await runEmbeddingsBackfill(prisma, typed, {
    jobRunId,
    newUuidV7: uuidv7,
    onProgress: async (progress) => {
      await updateJobRun(jobRunId, { progress: progress as Record<string, unknown> });
      await publishEvent({
        jobId: jobRunId,
        status: 'PROCESSING',
        progress: progress as Record<string, unknown>,
      });
    },
  });

  await updateJobRun(jobRunId, {
    status: JobRunStatus.COMPLETED,
    result: result as Record<string, unknown>,
    completedAt: new Date(),
  });
  await publishEvent({
    jobId: jobRunId,
    status: 'COMPLETED',
    result: result as Record<string, unknown>,
  });
}

async function processGmailStatementSync(job: Job<JobPayload>): Promise<void> {
  const { jobRunId, payload } = job.data;
  const typed = payload as GmailStatementSyncPayload;
  const startedAt = new Date();

  await updateJobRun(jobRunId, { status: JobRunStatus.PROCESSING, startedAt });
  await publishEvent({
    jobId: jobRunId,
    status: 'PROCESSING',
    progress: { message: 'Starting Gmail statement sync' },
  });

  const result = await runGmailStatementSync(prisma, typed, async (progress) => {
    await updateJobRun(jobRunId, { progress: progress as Record<string, unknown> });
    await publishEvent({
      jobId: jobRunId,
      status: 'PROCESSING',
      progress: progress as Record<string, unknown>,
    });
  });

  await updateJobRun(jobRunId, {
    status: JobRunStatus.COMPLETED,
    result: result as Record<string, unknown>,
    completedAt: new Date(),
  });
  await publishEvent({
    jobId: jobRunId,
    status: 'COMPLETED',
    result: result as Record<string, unknown>,
  });
}

async function startWorker(): Promise<void> {
  initFeatureFlags({ useLocalOnly: true });
  await refreshFeatureFlagsFromDb();
  setInterval(() => {
    void refreshFeatureFlagsFromDb().catch((error) => {
      console.error('[worker] Failed to refresh feature flags:', error);
    });
  }, FLAG_REFRESH_MS);

  const worker = new Worker<JobPayload>(
    'cardwise-jobs',
    async (job) => {
      const { jobRunId, type } = job.data;
      try {
        if (type === catalogAiIngestJob.type) {
          await processCatalogAiIngest(job);
          return;
        }
        if (type === catalogCrawlJob.type) {
          await processCatalogCrawl(job);
          return;
        }
        if (type === embeddingsBackfillJob.type) {
          await processEmbeddingsBackfill(job);
          return;
        }
        if (type === gmailStatementSyncJob.type) {
          await processGmailStatementSync(job);
          return;
        }
        throw new Error(`Unknown job type: ${type}`);
      } catch (error) {
        if (error instanceof JobCancelledError) {
          await updateJobRun(jobRunId, {
            status: JobRunStatus.CANCELLED,
            errorMessage: error.message,
            completedAt: new Date(),
          });
          await publishEvent({ jobId: jobRunId, status: 'CANCELLED', errorMessage: error.message });
          return;
        }

        const message = error instanceof Error ? error.message : String(error);
        await updateJobRun(jobRunId, {
          status: JobRunStatus.FAILED,
          errorMessage: message,
          completedAt: new Date(),
        });
        await publishEvent({ jobId: jobRunId, status: 'FAILED', errorMessage: message });
        throw error;
      }
    },
    { connection: bullConnection, concurrency: 1 },
  );

  worker.on('ready', () => {
    console.log('[worker] BullMQ worker ready on queue cardwise-jobs');
  });

  worker.on('failed', (job, error) => {
    console.error(`[worker] Job ${job?.id} failed:`, error.message);
  });

  process.on('SIGINT', async () => {
    await worker.close();
    await publisher.quit();
    await prisma.$disconnect();
    process.exit(0);
  });
}

void startWorker();