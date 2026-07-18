import { CatalogImportEntityType, type Prisma, type PrismaClient } from '@prisma/client';
import {
  crawlCatalogSource,
  catalogSourceKind,
  groundIngestBundle,
  isSupportedCatalogSourceSlug,
  AUTO_PUBLISH_GROUNDING_SCORE,
} from '@cardwise/catalog-ingest';
import type { CatalogCrawlPayload } from '@cardwise/jobs';
import type { CatalogImportIngestMeta, IngestCardBundle } from '@cardwise/validation';

export type NewUuidFn = () => string;

export async function runCatalogCrawl(
  prisma: PrismaClient,
  payload: CatalogCrawlPayload,
  newUuidV7: NewUuidFn,
): Promise<{ batchId: string; itemCount: number; bankSlug: string }> {
  const bankSlug = payload.sourceSlug ?? payload.bankSlug;
  if (!isSupportedCatalogSourceSlug(bankSlug)) {
    throw new Error(`Unsupported catalog source for crawl: ${bankSlug}`);
  }

  const payloads = await crawlCatalogSource(bankSlug);
  if (!payloads.length) {
    throw new Error(`No cards crawled for source: ${bankSlug}`);
  }

  const batchId = newUuidV7();
  const sourceKind = catalogSourceKind(bankSlug);

  await prisma.catalogImportBatch.create({
    data: {
      id: batchId,
      label: `${bankSlug} crawl ${new Date().toISOString().slice(0, 10)}`,
      source: `catalog-crawl:${bankSlug}`,
      metadata: {
        market: 'IN',
        bankSlug,
        sourceSlug: bankSlug,
        sourceKind,
        crawledAt: new Date().toISOString(),
        jobDriven: true,
      },
    },
  });

  const chunkSize = 50;
  const now = new Date();
  for (let offset = 0; offset < payloads.length; offset += chunkSize) {
    const chunk = payloads.slice(offset, offset + chunkSize);
    await prisma.catalogImportItem.createMany({
      data: chunk.map((item) => {
        const bundle = item.payload as IngestCardBundle;
        const grounded = groundIngestBundle(bundle, JSON.stringify(bundle));
        const candidateOnly = sourceKind === 'aggregator';
        const ingestMeta: CatalogImportIngestMeta = {
          method: 'crawl',
          sourceKind,
          catalogSourceSlug: bankSlug,
          grounding: grounded.grounding,
          sources: [{ kind: sourceKind, slug: bankSlug, sourceUrl: item.sourceUrl }],
          conflicts: [],
          autoPublishEligible:
            !candidateOnly &&
            !grounded.grounding.critical &&
            grounded.grounding.score >= AUTO_PUBLISH_GROUNDING_SCORE,
          candidateOnly,
        };
        return {
          id: newUuidV7(),
          batchId,
          entityType: item.entityType as CatalogImportEntityType,
          entityKey: item.entityKey,
          sourceUrl: item.sourceUrl,
          payload: { bundle: grounded.bundle, ingestMeta } as Prisma.InputJsonValue,
          summary: item.summary,
          updatedAt: now,
        };
      }),
    });
  }

  return { batchId, itemCount: payloads.length, bankSlug };
}
