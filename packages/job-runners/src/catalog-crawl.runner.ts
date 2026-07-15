import { CatalogImportEntityType, type Prisma, type PrismaClient } from '@prisma/client';
import { crawlBankCards, isSupportedBankSlug } from '@cardwise/catalog-ingest';
import type { CatalogCrawlPayload } from '@cardwise/jobs';

export type NewUuidFn = () => string;

export async function runCatalogCrawl(
  prisma: PrismaClient,
  payload: CatalogCrawlPayload,
  newUuidV7: NewUuidFn,
): Promise<{ batchId: string; itemCount: number; bankSlug: string }> {
  const { bankSlug } = payload;
  if (!isSupportedBankSlug(bankSlug)) {
    throw new Error(`Unsupported bank for crawl: ${bankSlug}`);
  }

  const payloads = await crawlBankCards(bankSlug);
  if (!payloads.length) {
    throw new Error(`No cards crawled for bank: ${bankSlug}`);
  }

  const batchId = newUuidV7();

  await prisma.catalogImportBatch.create({
    data: {
      id: batchId,
      label: `${bankSlug} crawl ${new Date().toISOString().slice(0, 10)}`,
      source: `bank-crawl:${bankSlug}`,
      metadata: {
        market: 'IN',
        bankSlug,
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
      data: chunk.map((item) => ({
        id: newUuidV7(),
        batchId,
        entityType: item.entityType as CatalogImportEntityType,
        entityKey: item.entityKey,
        sourceUrl: item.sourceUrl,
        payload: item.payload as Prisma.InputJsonValue,
        summary: item.summary,
        updatedAt: now,
      })),
    });
  }

  return { batchId, itemCount: payloads.length, bankSlug };
}
