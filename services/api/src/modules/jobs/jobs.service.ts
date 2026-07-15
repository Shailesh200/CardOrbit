import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JobRunStatus } from '@prisma/client';
import {
  getJobDefinition,
  listJobDefinitions,
  parseJobPayload,
  catalogAiIngestJob,
  embeddingsBackfillJob,
  type JobProgressEvent,
} from '@cardwise/jobs';
import { isAiConfigured } from '@cardwise/ai';
import { FeatureFlag } from '@cardwise/feature-flags';
import { Queue } from 'bullmq';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { newUuidV7 } from '../../infrastructure/prisma/uuid';
import { AiService } from '../ai/ai.service';
import { buildJobConfigView } from './jobs-config.mapper';
import { JobEventsService } from './job-events.service';

type EnqueueInput = {
  type: string;
  payload: unknown;
  triggeredBy?: string;
};

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private readonly redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
  private queue: Queue | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: JobEventsService,
    private readonly ai: AiService,
  ) {}

  listTypes() {
    return listJobDefinitions();
  }

  async enqueue(input: EnqueueInput) {
    const def = getJobDefinition(input.type);
    if (!def) {
      throw new BadRequestException(`Unknown job type: ${input.type}`);
    }

    const payload = parseJobPayload(input.type, input.payload);

    if (input.type === catalogAiIngestJob.type) {
      if (!isAiConfigured()) {
        throw new BadRequestException('AI is not configured — set GEMINI_API_KEY in environment');
      }
      if (!(await this.ai.isFeatureEnabled(FeatureFlag.AI_CATALOG_STRUCTURING_ENABLED))) {
        throw new BadRequestException('AI catalog structuring is disabled');
      }
    }

    if (input.type === embeddingsBackfillJob.type) {
      if (!isAiConfigured()) {
        throw new BadRequestException('AI is not configured — set GEMINI_API_KEY in environment');
      }
      if (!(await this.ai.isFeatureEnabled(FeatureFlag.AI_SEARCH_ENABLED))) {
        throw new BadRequestException('AI semantic search is disabled');
      }
    }

    const jobRunId = newUuidV7();
    const estimated = def.estimatedMinutes;

    const jobRun = await this.prisma.jobRun.create({
      data: {
        id: jobRunId,
        type: input.type,
        status: JobRunStatus.QUEUED,
        payload: payload as object,
        triggeredBy: input.triggeredBy ?? null,
        progress: {
          message: 'Queued — worker will pick this up shortly',
          estimatedMinutes: estimated ?? null,
        },
      },
    });

    try {
      const queue = this.getQueue();
      const bullJob = await queue.add(
        input.type,
        {
          jobRunId,
          type: input.type,
          payload,
          triggeredBy: input.triggeredBy,
        },
        { jobId: jobRunId, removeOnComplete: 100, removeOnFail: 200 },
      );

      await this.prisma.jobRun.update({
        where: { id: jobRunId },
        data: { bullJobId: String(bullJob.id) },
      });
    } catch (error) {
      this.logger.error(`Failed to enqueue job ${jobRunId}: ${error}`);
      await this.prisma.jobRun.update({
        where: { id: jobRunId },
        data: {
          status: JobRunStatus.FAILED,
          errorMessage: 'Worker queue unavailable — start Redis and the worker service',
          completedAt: new Date(),
        },
      });
      throw new ServiceUnavailableException(
        'Background worker unavailable. Ensure Redis is running and start the worker with `bun run --filter @cardwise/worker dev`.',
      );
    }

    await this.events.publish({
      jobId: jobRunId,
      status: 'QUEUED',
      progress: jobRun.progress as Record<string, unknown>,
    });

    return {
      id: jobRunId,
      type: input.type,
      status: jobRun.status,
      estimatedMinutes: estimated ?? null,
      message:
        estimated != null
          ? `Sync started. This may take ${estimated.min}–${estimated.max} minutes — you can leave and come back.`
          : 'Sync started — you can leave and come back.',
    };
  }

  async getJob(id: string) {
    const row = await this.prisma.jobRun.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`Job not found: ${id}`);
    return this.toDto(row);
  }

  async listJobs(query: { type?: string; limit?: number; offset?: number; active?: boolean }) {
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
    const offset = Math.max(query.offset ?? 0, 0);
    const where: { type?: string; status?: { in: JobRunStatus[] } } = query.type
      ? { type: query.type }
      : {};
    if (query.active) {
      where.status = { in: [JobRunStatus.QUEUED, JobRunStatus.PROCESSING] };
    }

    const [rows, total] = await Promise.all([
      this.prisma.jobRun.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.jobRun.count({ where }),
    ]);

    return { items: rows.map((row) => this.toDto(row)), total, limit, offset };
  }

  streamJobEvents(jobId: string): Observable<MessageEvent> {
    return this.events.observeJob(jobId).pipe(
      map(
        (event: JobProgressEvent) =>
          ({
            data: event,
          }) as MessageEvent,
      ),
    );
  }

  async cancelJob(id: string) {
    const row = await this.prisma.jobRun.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException(`Job not found: ${id}`);
    }

    if (row.status !== JobRunStatus.QUEUED && row.status !== JobRunStatus.PROCESSING) {
      throw new BadRequestException(`Job cannot be cancelled — status is ${row.status}`);
    }

    await this.prisma.jobRun.update({
      where: { id },
      data: {
        status: JobRunStatus.CANCELLED,
        errorMessage: 'Cancelled by operator',
        completedAt: new Date(),
      },
    });

    if (row.bullJobId) {
      try {
        const queue = this.getQueue();
        const bullJob = await queue.getJob(row.bullJobId);
        if (bullJob) {
          const state = await bullJob.getState();
          if (state === 'waiting' || state === 'delayed') {
            await bullJob.remove();
          }
        }
      } catch (error) {
        this.logger.warn(`Could not remove BullMQ job ${row.bullJobId}: ${error}`);
      }
    }

    await this.events.publish({
      jobId: id,
      status: 'CANCELLED',
      errorMessage: 'Cancelled by operator',
    });

    return this.getJob(id);
  }

  private getQueue(): Queue {
    if (!this.queue) {
      const url = new URL(this.redisUrl);
      this.queue = new Queue('cardwise-jobs', {
        connection: {
          host: url.hostname,
          port: Number(url.port || 6379),
          maxRetriesPerRequest: null,
        },
      });
    }
    return this.queue;
  }

  private toDto(row: {
    id: string;
    type: string;
    status: JobRunStatus;
    payload: unknown;
    progress: unknown;
    result: unknown;
    errorMessage: string | null;
    triggeredBy: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const def = getJobDefinition(row.type);
    const config = buildJobConfigView({
      type: row.type,
      payload: row.payload,
      progress: row.progress,
      result: row.result,
      status: row.status,
    });
    return {
      id: row.id,
      type: row.type,
      description: def?.description ?? row.type,
      ...config,
      status: row.status,
      payload: row.payload,
      progress: row.progress,
      result: row.result,
      errorMessage: row.errorMessage,
      triggeredBy: row.triggeredBy,
      estimatedMinutes: def?.estimatedMinutes ?? null,
      startedAt: row.startedAt?.toISOString() ?? null,
      completedAt: row.completedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
