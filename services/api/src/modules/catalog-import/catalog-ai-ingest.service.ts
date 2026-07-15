import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { isAiConfigured, structureCardBundleFromPage } from '@cardwise/ai';
import {
  crawlIdfcFirstCard,
  discoverBankCardUrls,
  fetchText,
  bankCatalogUrl,
  parseGenericCardPage,
  IDFC_FIRST_BANK_SLUG,
  IDFC_FIRST_CATALOG_URL,
  isSupportedAiIngestBankSlug,
} from '@cardwise/catalog-ingest';
import { FeatureFlag } from '@cardwise/feature-flags';
import {
  parseIngestCardBundle,
  type CatalogImportIngestMeta,
  type IngestCardBundle,
} from '@cardwise/validation';
import { CatalogImportReviewStatus, type Prisma } from '@prisma/client';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { newUuidV7 } from '../../infrastructure/prisma/uuid';
import { AiService } from '../ai/ai.service';

const CARD_DELAY_MS = 1_500;

export type AiIngestJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export type AiIngestBatchMetadata = {
  market: 'IN';
  bankSlug: string;
  ingestMethod: 'ai';
  status: AiIngestJobStatus;
  promptVersion: string | null;
  model: string;
  purgedPending: number;
  discoveredUrls: number;
  totalUrls: number;
  processedUrls: number;
  itemCount: number;
  failedUrls: string[];
  currentUrl?: string | null;
  startedAt: string;
  completedAt?: string | null;
  error?: string | null;
  limit?: number | null;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pathFromUrl(sourceUrl: string): string {
  return new URL(sourceUrl).pathname.replace(/\/+$/, '') || new URL(sourceUrl).pathname;
}

function buildSummary(bundle: IngestCardBundle, meta: CatalogImportIngestMeta): string {
  const methodLabel =
    meta.method === 'ai'
      ? `AI · ${meta.model ?? 'model'}`
      : meta.method === 'ai+fallback'
        ? `AI + fallback · ${meta.model ?? 'model'}`
        : 'Rule-based fallback';
  return `${bundle.name} — ${methodLabel} · ${bundle.tags.length} tags · ${bundle.highlights.length} highlights · ${bundle.structuredFees.length} fees · ${bundle.sourceUrl}`;
}

function asBatchMetadata(value: unknown): AiIngestBatchMetadata | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (row.ingestMethod !== 'ai' || typeof row.status !== 'string') return null;
  return value as AiIngestBatchMetadata;
}

@Injectable()
export class CatalogAiIngestService {
  private readonly logger = new Logger(CatalogAiIngestService.name);
  private readonly activeJobs = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {}

  async startAiIngestJob(
    bankSlug: string,
    adminId?: string,
    options?: { purgePending?: boolean; limit?: number },
  ): Promise<{
    batchId: string;
    bankSlug: string;
    status: AiIngestJobStatus;
    totalUrls: number;
    purgedPending: number;
  }> {
    if (!isSupportedAiIngestBankSlug(bankSlug)) {
      throw new BadRequestException(`Unsupported bank for AI ingest: ${bankSlug}`);
    }

    if (!(await this.ai.isFeatureEnabled(FeatureFlag.AI_CATALOG_STRUCTURING_ENABLED))) {
      throw new BadRequestException(
        'AI catalog structuring is disabled. Enable ai_platform_enabled and ai_catalog_structuring_enabled in Admin → Feature flags',
      );
    }

    if (!isAiConfigured()) {
      throw new BadRequestException('AI is not configured — set GEMINI_API_KEY in environment');
    }

    if ([...this.activeJobs].some((id) => id.startsWith(`${bankSlug}:`))) {
      throw new BadRequestException(
        `AI ingest already running for ${bankSlug}. Wait for it to finish or check batch status.`,
      );
    }

    const purgePending = options?.purgePending ?? true;
    let purgedPending = 0;
    if (purgePending) {
      const deleted = await this.prisma.catalogImportItem.deleteMany({
        where: { reviewStatus: CatalogImportReviewStatus.PENDING_REVIEW },
      });
      purgedPending = deleted.count;
      if (purgedPending > 0) {
        this.logger.log(`Purged ${purgedPending} pending import items before AI ingest`);
      }
    }

    const execConfig = await this.ai.getFeatureExecutionConfig('catalog-structure');
    const discovered = await discoverBankCardUrls(bankSlug);
    if (!discovered.length) {
      throw new BadRequestException(`No card URLs discovered for bank: ${bankSlug}`);
    }

    const limit =
      options?.limit && options.limit > 0
        ? Math.min(options.limit, discovered.length)
        : discovered.length;
    const cardUrls = discovered.slice(0, limit);

    const batchId = newUuidV7();
    const startedAt = new Date().toISOString();
    const metadata: AiIngestBatchMetadata = {
      market: 'IN',
      bankSlug,
      ingestMethod: 'ai',
      status: 'queued',
      promptVersion: execConfig.promptVersion,
      model: execConfig.effectiveModel,
      purgedPending,
      discoveredUrls: discovered.length,
      totalUrls: cardUrls.length,
      processedUrls: 0,
      itemCount: 0,
      failedUrls: [],
      currentUrl: null,
      startedAt,
      limit: options?.limit ?? null,
    };

    await this.prisma.catalogImportBatch.create({
      data: {
        id: batchId,
        label: `${bankSlug} AI ingest ${startedAt.slice(0, 10)}`,
        source: `ai-ingest:${bankSlug}`,
        metadata,
      },
    });

    const jobKey = `${bankSlug}:${batchId}`;
    this.activeJobs.add(jobKey);

    void this.runAiIngestJob({
      batchId,
      bankSlug,
      cardUrls,
      adminId,
      execConfig,
      jobKey,
    }).catch((error) => {
      this.logger.error(
        `AI ingest job ${batchId} crashed: ${error instanceof Error ? error.message : error}`,
      );
    });

    return {
      batchId,
      bankSlug,
      status: 'queued',
      totalUrls: cardUrls.length,
      purgedPending,
    };
  }

  async getAiIngestJobStatus(batchId: string) {
    const batch = await this.prisma.catalogImportBatch.findUnique({ where: { id: batchId } });
    if (!batch) throw new NotFoundException(`Import batch not found: ${batchId}`);

    const metadata = asBatchMetadata(batch.metadata);
    if (!metadata) {
      throw new BadRequestException('Batch is not an AI ingest job');
    }

    const itemCount = await this.prisma.catalogImportItem.count({ where: { batchId } });

    return {
      batchId,
      bankSlug: metadata.bankSlug,
      status: metadata.status,
      totalUrls: metadata.totalUrls,
      processedUrls: metadata.processedUrls,
      itemCount: Math.max(metadata.itemCount, itemCount),
      failedUrls: metadata.failedUrls,
      currentUrl: metadata.currentUrl ?? null,
      model: metadata.model,
      promptVersion: metadata.promptVersion,
      purgedPending: metadata.purgedPending,
      discoveredUrls: metadata.discoveredUrls,
      startedAt: metadata.startedAt,
      completedAt: metadata.completedAt ?? null,
      error: metadata.error ?? null,
    };
  }

  private async runAiIngestJob(input: {
    batchId: string;
    bankSlug: string;
    cardUrls: string[];
    adminId?: string;
    execConfig: Awaited<ReturnType<AiService['getFeatureExecutionConfig']>>;
    jobKey: string;
  }) {
    const { batchId, bankSlug, cardUrls, adminId, execConfig, jobKey } = input;

    try {
      await this.patchBatchMetadata(batchId, { status: 'processing' });

      let itemCount = 0;
      const failedUrls: string[] = [];

      for (let index = 0; index < cardUrls.length; index++) {
        const sourceUrl = cardUrls[index]!;
        await this.patchBatchMetadata(batchId, {
          currentUrl: sourceUrl,
          processedUrls: index,
        });

        if (index > 0) await sleep(CARD_DELAY_MS);

        try {
          const stagedItem = await this.ingestCardUrl({
            bankSlug,
            sourceUrl,
            adminId,
            execConfig,
          });

          if (stagedItem) {
            await this.prisma.catalogImportItem.create({
              data: {
                id: newUuidV7(),
                batchId,
                entityType: 'CARD_BUNDLE',
                entityKey: stagedItem.entityKey,
                sourceUrl: stagedItem.sourceUrl,
                payload: stagedItem.payload,
                summary: stagedItem.summary,
              },
            });
            itemCount += 1;
          }
        } catch (error) {
          failedUrls.push(sourceUrl);
          this.logger.warn(
            `AI ingest skipped ${sourceUrl}: ${error instanceof Error ? error.message : error}`,
          );
        }

        await this.patchBatchMetadata(batchId, {
          processedUrls: index + 1,
          itemCount,
          failedUrls,
          currentUrl: null,
        });
      }

      if (itemCount === 0) {
        await this.patchBatchMetadata(batchId, {
          status: 'failed',
          completedAt: new Date().toISOString(),
          error: `No cards ingested (${failedUrls.length} URLs failed). Check API logs and Gemini quota.`,
          currentUrl: null,
        });
        return;
      }

      await this.patchBatchMetadata(batchId, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        itemCount,
        failedUrls,
        currentUrl: null,
        error: null,
      });

      this.logger.log(`AI ingest batch ${batchId} completed: ${itemCount} cards staged`);
    } catch (error) {
      await this.patchBatchMetadata(batchId, {
        status: 'failed',
        completedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
        currentUrl: null,
      });
      throw error;
    } finally {
      this.activeJobs.delete(jobKey);
    }
  }

  private async patchBatchMetadata(
    batchId: string,
    patch: Partial<AiIngestBatchMetadata>,
  ): Promise<void> {
    const batch = await this.prisma.catalogImportBatch.findUnique({ where: { id: batchId } });
    if (!batch) return;

    const current = asBatchMetadata(batch.metadata) ?? ({} as AiIngestBatchMetadata);
    await this.prisma.catalogImportBatch.update({
      where: { id: batchId },
      data: {
        metadata: {
          ...current,
          ...patch,
        },
      },
    });
  }

  private async ingestCardUrl(input: {
    bankSlug: string;
    sourceUrl: string;
    adminId?: string;
    execConfig: Awaited<ReturnType<AiService['getFeatureExecutionConfig']>>;
  }): Promise<{
    entityKey: string;
    sourceUrl: string;
    payload: Prisma.InputJsonValue;
    summary: string;
  } | null> {
    const { bankSlug, sourceUrl, adminId, execConfig } = input;
    const html = await fetchText(sourceUrl);
    const path = pathFromUrl(sourceUrl);

    let aiBundle: IngestCardBundle | null = null;
    let aiModel: string | undefined;
    let aiLatencyMs: number | undefined;
    let aiError: string | undefined;

    try {
      const aiResult = await structureCardBundleFromPage({
        bankSlug,
        sourceUrl,
        bankSourceUrl: bankSlug === IDFC_FIRST_BANK_SLUG ? IDFC_FIRST_CATALOG_URL : undefined,
        html,
        systemPrompt: execConfig.systemPrompt,
        modelTier: execConfig.modelTier,
        modelOverride: execConfig.modelOverride,
        promptVersion: execConfig.promptVersion ?? undefined,
        triggeredBy: adminId ?? 'admin-ai-ingest',
      });
      aiBundle = aiResult.data;
      aiModel = aiResult.model;
      aiLatencyMs = aiResult.latencyMs;
    } catch (error) {
      aiError = error instanceof Error ? error.message : String(error);
    }

    let fallbackBundle: IngestCardBundle | null = null;
    if (bankSlug === IDFC_FIRST_BANK_SLUG) {
      try {
        const crawled = await crawlIdfcFirstCard(path);
        if (crawled?.bundle) fallbackBundle = crawled.bundle;
      } catch {
        // Fallback parser optional.
      }
    } else {
      try {
        fallbackBundle = parseGenericCardPage({
          bankSlug,
          sourceUrl,
          html,
          bankSourceUrl: bankCatalogUrl(bankSlug),
        });
      } catch {
        // Fallback parser optional.
      }
    }

    let bundle: IngestCardBundle;
    let ingestMeta: CatalogImportIngestMeta;

    if (aiBundle) {
      bundle = aiBundle;
      ingestMeta = {
        method: fallbackBundle ? 'ai+fallback' : 'ai',
        model: aiModel,
        promptVersion: execConfig.promptVersion ?? undefined,
        latencyMs: aiLatencyMs,
        ...(fallbackBundle ? { fallbackBundle } : {}),
      };
    } else if (fallbackBundle) {
      bundle = fallbackBundle;
      ingestMeta = {
        method: 'fallback',
        fallbackBundle,
      };
    } else {
      throw new Error(aiError ?? 'AI and fallback parsers both failed');
    }

    parseIngestCardBundle(bundle);

    return {
      entityKey: bundle.slug,
      sourceUrl,
      payload: {
        bundle,
        ingestMeta,
      },
      summary: buildSummary(bundle, ingestMeta),
    };
  }
}
