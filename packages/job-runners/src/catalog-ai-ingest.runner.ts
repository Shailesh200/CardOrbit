import { PrismaClient, CatalogImportReviewStatus, type Prisma } from '@prisma/client';
import { isAiConfigured, structureCardBundleFromPage } from '@cardwise/ai';
import {
  crawlIdfcFirstCard,
  discoverCatalogCardUrls,
  fetchText,
  fetchAndExtractPdfText,
  extractSourceDocumentLinks,
  mergeSourceDocuments,
  bankCatalogUrl,
  catalogSourceUrl,
  catalogSourceKind,
  getCatalogCrawlerAdapter,
  getCatalogSource,
  groundIngestBundle,
  AUTO_PUBLISH_GROUNDING_SCORE,
  isSupportedCatalogSourceSlug,
  parseGenericCardPage,
  IDFC_FIRST_BANK_SLUG,
  IDFC_FIRST_CATALOG_URL,
} from '@cardwise/catalog-ingest';
import type {
  CatalogAiIngestPayload,
  CatalogAiIngestProgress,
  CatalogAiIngestResult,
  JobLogEntry,
} from '@cardwise/jobs';
import { validateCatalogBundleSafety } from '@cardwise/ai';
import { parseIngestCardBundle, type CatalogImportIngestMeta, type IngestCardBundle } from '@cardwise/validation';

import type { NewUuidFn } from './catalog-crawl.runner';
import { assertJobActive, JobCancelledError } from './job-cancel';

export { JobCancelledError } from './job-cancel';

const CARD_DELAY_MS = 1_500;
const MAX_LOG_LINES = 80;

export type JobProgressCallback = (progress: CatalogAiIngestProgress) => Promise<void>;

export type AiExecConfig = {
  promptVersion: string | null;
  systemPrompt: string;
  modelTier: 'fast' | 'quality' | 'ping';
  modelOverride: string | null;
  effectiveModel: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pathFromUrl(sourceUrl: string): string {
  return new URL(sourceUrl).pathname.replace(/\/+$/, '') || new URL(sourceUrl).pathname;
}

function labelFromUrl(sourceUrl: string): string {
  const segment = pathFromUrl(sourceUrl).split('/').filter(Boolean).pop();
  return segment ? decodeURIComponent(segment).replace(/-/g, ' ') : sourceUrl;
}

/**
 * AI structuring only emits `rewardRules` when the page states an explicit numeric rate,
 * so it's frequently empty even when the page clearly advertises an earn rate. The
 * rule-based fallback parser is regex-driven and picks up simple "NX" / "N% cashback"
 * patterns more reliably, so prefer its rules whenever the AI draft came back empty.
 */
export function mergeAiRewardRules(
  aiRewardRules: IngestCardBundle['rewardRules'],
  fallbackRewardRules: IngestCardBundle['rewardRules'] | undefined,
): IngestCardBundle['rewardRules'] {
  if (aiRewardRules.length > 0) return aiRewardRules;
  return fallbackRewardRules ?? [];
}

function buildSummary(bundle: IngestCardBundle, meta: CatalogImportIngestMeta): string {
  const methodLabel =
    meta.method === 'ai'
      ? `AI · ${meta.model ?? 'model'}`
      : meta.method === 'ai+fallback'
        ? `AI + fallback · ${meta.model ?? 'model'}`
        : 'Rule-based fallback';
  return `${bundle.name} — ${methodLabel} · ${bundle.tags.length} tags · ${bundle.highlights.length} highlights · ${bundle.sourceUrl}`;
}

class ProgressTracker {
  private readonly logs: JobLogEntry[] = [];
  private lastStagedName: string | null = null;
  private done = 0;
  private total = 0;
  private currentUrl: string | null = null;
  private itemCount = 0;
  private failedCount = 0;

  constructor(
    private readonly emit: JobProgressCallback,
    private readonly ctx: { bankSlug: string; batchId: string },
  ) {}

  private push(level: JobLogEntry['level'], message: string) {
    this.logs.push({ at: new Date().toISOString(), level, message });
    if (this.logs.length > MAX_LOG_LINES) this.logs.shift();
  }

  async log(level: JobLogEntry['level'], message: string, patch?: Partial<CatalogAiIngestProgress>) {
    this.push(level, message);
    await this.snapshot(patch);
  }

  async snapshot(patch: Partial<CatalogAiIngestProgress> = {}) {
    if (patch.done !== undefined) this.done = patch.done;
    if (patch.total !== undefined) this.total = patch.total;
    if (patch.currentUrl !== undefined) this.currentUrl = patch.currentUrl;
    if (patch.itemCount !== undefined) this.itemCount = patch.itemCount;
    if (patch.failedCount !== undefined) this.failedCount = patch.failedCount;
    if (patch.lastStagedName !== undefined) this.lastStagedName = patch.lastStagedName;

    await this.emit({
      done: this.done,
      total: this.total,
      currentUrl: this.currentUrl,
      itemCount: this.itemCount,
      failedCount: this.failedCount,
      bankSlug: this.ctx.bankSlug,
      batchId: this.ctx.batchId,
      lastStagedName: this.lastStagedName,
      logs: [...this.logs],
      ...patch,
    });
  }
}

export async function runCatalogAiIngest(
  prisma: PrismaClient,
  payload: CatalogAiIngestPayload,
  options: {
    triggeredBy?: string;
    jobRunId?: string;
    newUuidV7: NewUuidFn;
    onProgress: JobProgressCallback;
    execConfig: AiExecConfig;
  },
): Promise<CatalogAiIngestResult> {
  const bankSlug = payload.sourceSlug ?? payload.bankSlug;
  if (!isSupportedCatalogSourceSlug(bankSlug)) {
    throw new Error(`Unsupported catalog source for AI ingest: ${bankSlug}`);
  }
  if (!isAiConfigured()) {
    throw new Error('AI is not configured');
  }

  const sourceMeta = getCatalogSource(bankSlug);
  const batchId = options.newUuidV7();
  const tracker = new ProgressTracker(options.onProgress, { bankSlug, batchId });

  await tracker.log('info', `Starting AI ingest for ${bankSlug} (${sourceMeta?.kind ?? 'issuer'})`, {
    done: 0,
    total: 0,
    currentUrl: null,
    itemCount: 0,
    failedCount: 0,
    phase: 'discovering',
    message: 'Preparing catalog sync…',
  });

  let purgedPending = 0;
  if (payload.purgePending !== false) {
    const deleted = await prisma.catalogImportItem.deleteMany({
      where: {
        reviewStatus: CatalogImportReviewStatus.PENDING_REVIEW,
        batch: { source: `ai-ingest:${bankSlug}` },
      },
    });
    purgedPending = deleted.count;
    if (purgedPending > 0) {
      await tracker.log('info', `Cleared ${purgedPending} pending import item(s) for ${bankSlug}`);
    }
  }

  await tracker.log('info', 'Discovering card product URLs from catalog source', { phase: 'discovering' });
  const discovered = await discoverCatalogCardUrls(bankSlug);
  const limit =
    payload.limit && payload.limit > 0 ? Math.min(payload.limit, discovered.length) : discovered.length;
  const cardUrls = discovered.slice(0, limit);

  await tracker.log('info', `Discovered ${discovered.length} URLs — processing ${cardUrls.length}`, {
    total: cardUrls.length,
    phase: 'waiting',
  });

  await prisma.catalogImportBatch.create({
    data: {
      id: batchId,
      label: `${bankSlug} AI ingest ${new Date().toISOString().slice(0, 10)}`,
      source: `ai-ingest:${bankSlug}`,
      metadata: {
        market: 'IN',
        bankSlug,
        sourceSlug: bankSlug,
        sourceKind: sourceMeta?.kind ?? 'issuer',
        ingestMethod: 'ai',
        jobDriven: true,
        promptVersion: options.execConfig.promptVersion,
        model: options.execConfig.effectiveModel,
        purgedPending,
        discoveredUrls: discovered.length,
      },
    },
  });

  await tracker.log('info', `Created import batch ${batchId.slice(0, 8)}…`);

  let itemCount = 0;
  const failedUrls: string[] = [];

  for (let index = 0; index < cardUrls.length; index++) {
    try {
      await assertJobActive(prisma, options.jobRunId);
    } catch (error) {
      if (error instanceof JobCancelledError) {
        await tracker.log('info', 'Sync cancelled by operator', {
          done: index,
          total: cardUrls.length,
          currentUrl: null,
          itemCount,
          failedCount: failedUrls.length,
          phase: 'done',
          message: `Cancelled after staging ${itemCount} card(s)`,
        });
        return { batchId, itemCount, failedUrls, purgedPending, cancelled: true };
      }
      throw error;
    }

    const sourceUrl = cardUrls[index]!;
    const itemLabel = labelFromUrl(sourceUrl);

    await tracker.snapshot({
      done: index,
      total: cardUrls.length,
      currentUrl: sourceUrl,
      currentItemLabel: itemLabel,
      itemCount,
      failedCount: failedUrls.length,
      phase: 'fetching',
      message: `Item ${index + 1} of ${cardUrls.length}: fetching page`,
    });
    await tracker.log('info', `[${index + 1}/${cardUrls.length}] Fetching ${itemLabel}`);

    if (index > 0) await sleep(CARD_DELAY_MS);

    try {
      const staged = await ingestCardUrl({
        bankSlug,
        sourceUrl,
        triggeredBy: options.triggeredBy,
        execConfig: options.execConfig,
        onPhase: async (phase, detail) => {
          await tracker.snapshot({
            done: index,
            total: cardUrls.length,
            currentUrl: sourceUrl,
            currentItemLabel: itemLabel,
            itemCount,
            failedCount: failedUrls.length,
            phase,
            message: detail,
          });
        },
      });

      if (staged) {
        await tracker.snapshot({
          done: index,
          total: cardUrls.length,
          currentUrl: sourceUrl,
          currentItemLabel: itemLabel,
          itemCount,
          failedCount: failedUrls.length,
          phase: 'staging',
          message: 'Writing staged bundle to import queue',
        });

        await prisma.catalogImportItem.create({
          data: {
            id: options.newUuidV7(),
            batchId,
            entityType: 'CARD_BUNDLE',
            entityKey: staged.entityKey,
            sourceUrl: staged.sourceUrl,
            payload: staged.payload,
            summary: staged.summary,
          },
        });
        itemCount += 1;
        if (staged.aiFallbackReason) {
          await tracker.log('warn', `AI structuring skipped: ${staged.aiFallbackReason}`);
        }
        await tracker.log('success', `Staged: ${staged.cardName} (${staged.method})`, {
          lastStagedName: staged.cardName,
          itemCount,
        });
      }
    } catch (error) {
      failedUrls.push(sourceUrl);
      const message = error instanceof Error ? error.message : String(error);
      await tracker.log('error', `Failed ${itemLabel}: ${message}`, {
        failedCount: failedUrls.length,
        phase: 'done',
      });
    }

    await tracker.snapshot({
      done: index + 1,
      total: cardUrls.length,
      currentUrl: null,
      currentItemLabel: null,
      itemCount,
      failedCount: failedUrls.length,
      phase: 'waiting',
      message:
        index + 1 < cardUrls.length
          ? `Waiting before next item (${CARD_DELAY_MS / 1000}s throttle)`
          : 'Finishing sync',
    });
  }

  if (itemCount === 0) {
    throw new Error(`No cards ingested (${failedUrls.length} URLs failed)`);
  }

  await tracker.log('success', `Sync complete — ${itemCount} staged, ${failedUrls.length} failed`, {
    done: cardUrls.length,
    total: cardUrls.length,
    currentUrl: null,
    itemCount,
    failedCount: failedUrls.length,
    phase: 'done',
  });

  return { batchId, itemCount, failedUrls, purgedPending };
}

async function ingestCardUrl(input: {
  bankSlug: string;
  sourceUrl: string;
  triggeredBy?: string;
  execConfig: {
    promptVersion: string | null;
    systemPrompt: string;
    modelTier: 'fast' | 'quality' | 'ping';
    modelOverride: string | null;
  };
  onPhase: (phase: CatalogAiIngestProgress['phase'], detail: string) => Promise<void>;
}) {
  const { bankSlug: sourceSlug, sourceUrl, triggeredBy, execConfig, onPhase } = input;
  const sourceKind = catalogSourceKind(sourceSlug);
  const catalogReferer =
    sourceSlug === IDFC_FIRST_BANK_SLUG ? IDFC_FIRST_CATALOG_URL : catalogSourceUrl(sourceSlug);
  const html = await fetchText(sourceUrl, 30_000, catalogReferer);
  const path = pathFromUrl(sourceUrl);
  const adapter = getCatalogCrawlerAdapter(sourceSlug);

  const sourceDocuments = extractSourceDocumentLinks(html, sourceUrl);
  const PDF_DOCUMENT_KINDS = new Set(['MITC', 'TNC', 'KFS', 'SCHEDULE_OF_CHARGES', 'PDF']);
  let pdfExcerpt: string | undefined;
  const pdfCandidate = sourceDocuments.find((doc) => PDF_DOCUMENT_KINDS.has(doc.kind));
  if (pdfCandidate) {
    await onPhase('structuring', 'Fetching MITC/PDF evidence for secondary context');
    try {
      const { text } = await fetchAndExtractPdfText(pdfCandidate.url, 15_000, sourceUrl);
      pdfExcerpt = text || undefined;
    } catch {
      // best-effort
    }
  }

  await onPhase('structuring', 'Running AI structuring on page HTML');

  let aiBundle: IngestCardBundle | null = null;
  let aiModel: string | undefined;
  let aiLatencyMs: number | undefined;
  let aiError: string | undefined;

  const aiBankSlug =
    sourceKind === 'aggregator'
      ? (await adapter.parseProductPage({ sourceUrl, html }))?.bankSlug ?? 'hdfc'
      : sourceSlug;

  try {
    const aiResult = await structureCardBundleFromPage({
      bankSlug: aiBankSlug,
      sourceUrl,
      bankSourceUrl: catalogReferer,
      html,
      secondaryText: pdfExcerpt,
      systemPrompt: execConfig.systemPrompt,
      modelTier: execConfig.modelTier,
      modelOverride: execConfig.modelOverride,
      promptVersion: execConfig.promptVersion ?? undefined,
      triggeredBy: triggeredBy ?? 'worker',
    });
    aiBundle = aiResult.data;
    aiModel = aiResult.model;
    aiLatencyMs = aiResult.latencyMs;
  } catch (error) {
    aiError = error instanceof Error ? error.message : String(error);
  }

  let fallbackBundle: IngestCardBundle | null = null;
  await onPhase('structuring', 'Running rule-based fallback parser');
  try {
    if (sourceSlug === IDFC_FIRST_BANK_SLUG) {
      const crawled = await crawlIdfcFirstCard(path, html);
      if (crawled?.bundle) fallbackBundle = crawled.bundle;
    } else if (sourceKind === 'aggregator') {
      fallbackBundle = (await adapter.parseProductPage({ sourceUrl, html })) ?? null;
    } else {
      fallbackBundle = parseGenericCardPage({
        bankSlug: sourceSlug,
        sourceUrl,
        html,
        bankSourceUrl: bankCatalogUrl(sourceSlug),
      });
    }
  } catch {
    // optional
  }

  const mergedSourceDocuments = mergeSourceDocuments(
    sourceDocuments,
    fallbackBundle?.sourceDocuments ?? [],
    aiBundle?.sourceDocuments ?? [],
  );

  let bundle: IngestCardBundle;
  let ingestMeta: CatalogImportIngestMeta;

  if (aiBundle) {
    const rewardRules = mergeAiRewardRules(aiBundle.rewardRules, fallbackBundle?.rewardRules);
    bundle = { ...aiBundle, rewardRules, sourceDocuments: mergedSourceDocuments };
    ingestMeta = {
      method: fallbackBundle ? 'ai+fallback' : 'ai',
      model: aiModel,
      promptVersion: execConfig.promptVersion ?? undefined,
      latencyMs: aiLatencyMs,
      ...(fallbackBundle ? { fallbackBundle } : {}),
    };
  } else if (fallbackBundle) {
    bundle = { ...fallbackBundle, sourceDocuments: mergedSourceDocuments };
    ingestMeta = { method: 'fallback', fallbackBundle };
  } else {
    const detail = aiError ? `AI: ${aiError}` : 'no structured data extracted';
    throw new Error(`AI and fallback parsers both failed (${detail})`);
  }

  const corpus = `${html}\n${pdfExcerpt ?? ''}`;
  const grounded = groundIngestBundle(bundle, corpus);
  bundle = grounded.bundle;

  const safetyIssues = validateCatalogBundleSafety(bundle);
  for (const message of safetyIssues) {
    grounded.grounding.issues.push({ code: 'SAFETY', message });
  }

  parseIngestCardBundle(bundle);

  const candidateOnly = sourceKind === 'aggregator';
  const autoPublishEligible =
    !candidateOnly &&
    !grounded.grounding.critical &&
    grounded.grounding.score >= AUTO_PUBLISH_GROUNDING_SCORE &&
    safetyIssues.length === 0;

  ingestMeta = {
    ...ingestMeta,
    sourceKind,
    catalogSourceSlug: sourceSlug,
    grounding: grounded.grounding,
    sources: [
      {
        kind: sourceKind,
        slug: sourceSlug,
        sourceUrl,
      },
    ],
    conflicts: [],
    similarCardSlug: null,
    autoPublishEligible,
    candidateOnly,
  };

  const method =
    ingestMeta.method === 'ai'
      ? `AI · ${ingestMeta.model ?? 'model'}`
      : ingestMeta.method === 'ai+fallback'
        ? 'AI + fallback'
        : 'fallback';

  return {
    entityKey: bundle.slug,
    sourceUrl,
    payload: { bundle, ingestMeta } as Prisma.InputJsonValue,
    summary: buildSummary(bundle, ingestMeta),
    cardName: bundle.name,
    method,
    aiFallbackReason: !aiBundle && fallbackBundle ? aiError : undefined,
  };
}
