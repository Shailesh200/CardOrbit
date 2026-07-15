import type { PrismaClient } from '@prisma/client';
import { embedTexts, loadAiConfig } from '@cardwise/ai';
import type { EmbeddingsBackfillPayload, EmbeddingsBackfillProgress } from '@cardwise/jobs';
import {
  buildCardSearchDocument,
  buildMerchantSearchDocument,
  formatVectorLiteral,
  hashSearchDocument,
} from '@cardwise/validation';

import { assertJobActive } from './job-cancel';

const BATCH_SIZE = 16;

type PendingEmbedding = {
  entityType: 'CARD' | 'MERCHANT';
  entityId: string;
  text: string;
  contentHash: string;
  label: string;
};

export type EmbeddingsProgressCallback = (progress: EmbeddingsBackfillProgress) => Promise<void>;

async function loadExistingHashes(
  prisma: PrismaClient,
  model: string,
): Promise<Map<string, string>> {
  const rows = await prisma.searchEmbedding.findMany({
    where: { model },
    select: { entityType: true, entityId: true, contentHash: true },
  });

  return new Map(rows.map((row) => [`${row.entityType}:${row.entityId}`, row.contentHash]));
}

async function upsertEmbedding(
  prisma: PrismaClient,
  input: PendingEmbedding & { model: string; values: number[] },
  newUuidV7: () => string,
): Promise<void> {
  const vectorLiteral = formatVectorLiteral(input.values);

  await prisma.$executeRawUnsafe(
    `
    INSERT INTO admin.search_embeddings (
      id, entity_type, entity_id, model, content_hash, text_content, embedding, updated_at
    )
    VALUES ($1::uuid, $2::admin."SearchEmbeddingEntityType", $3::uuid, $4, $5, $6, $7::vector, NOW())
    ON CONFLICT (entity_type, entity_id, model)
    DO UPDATE SET
      content_hash = EXCLUDED.content_hash,
      text_content = EXCLUDED.text_content,
      embedding = EXCLUDED.embedding,
      updated_at = NOW()
    `,
    newUuidV7(),
    input.entityType,
    input.entityId,
    input.model,
    input.contentHash,
    input.text,
    vectorLiteral,
  );
}

export async function runEmbeddingsBackfill(
  prisma: PrismaClient,
  payload: EmbeddingsBackfillPayload,
  options: {
    jobRunId?: string;
    newUuidV7: () => string;
    onProgress?: EmbeddingsProgressCallback;
  },
): Promise<{ indexed: number; skipped: number; failed: number; model: string }> {
  const entityTypes = payload.entityTypes ?? ['card', 'merchant'];
  const config = loadAiConfig();
  const existingHashes = payload.force ? new Map<string, string>() : await loadExistingHashes(prisma, config.embeddingModel);

  const pending: PendingEmbedding[] = [];

  if (entityTypes.includes('card')) {
    const cards = await prisma.creditCard.findMany({
      where: { deletedAt: null, active: true },
      include: {
        bank: true,
        network: true,
        benefits: {
          where: { deletedAt: null },
          take: 12,
          orderBy: { title: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
      ...(payload.limit ? { take: payload.limit } : {}),
    });

    for (const card of cards) {
      const text = buildCardSearchDocument({
        name: card.name,
        slug: card.slug,
        bankName: card.bank.name,
        networkName: card.network.name,
        tier: card.tier,
        annualFeeInr: card.annualFeeInr?.toString() ?? null,
        benefits: card.benefits.map((row) => ({
          title: row.title,
          description: row.description,
        })),
      });

      pending.push({
        entityType: 'CARD',
        entityId: card.id,
        text,
        contentHash: hashSearchDocument(text),
        label: card.name,
      });
    }
  }

  if (entityTypes.includes('merchant')) {
    const merchants = await prisma.merchant.findMany({
      where: { deletedAt: null, active: true },
      include: {
        primaryCategory: true,
        aliases: {
          where: { deletedAt: null },
          take: 8,
        },
      },
      orderBy: { name: 'asc' },
      ...(payload.limit ? { take: payload.limit } : {}),
    });

    for (const merchant of merchants) {
      const tags = Array.isArray(merchant.tags)
        ? merchant.tags.filter((value): value is string => typeof value === 'string')
        : [];

      const text = buildMerchantSearchDocument({
        name: merchant.name,
        slug: merchant.slug,
        categoryName: merchant.primaryCategory?.name ?? null,
        brandName: merchant.brandName,
        tags,
        aliases: merchant.aliases.map((row) => row.alias),
      });

      pending.push({
        entityType: 'MERCHANT',
        entityId: merchant.id,
        text,
        contentHash: hashSearchDocument(text),
        label: merchant.name,
      });
    }
  }

  const toEmbed = pending.filter((row) => {
    const key = `${row.entityType}:${row.entityId}`;
    return payload.force || existingHashes.get(key) !== row.contentHash;
  });

  let indexed = 0;
  let skipped = pending.length - toEmbed.length;
  let failed = 0;
  const total = toEmbed.length;

  await options.onProgress?.({
    done: 0,
    total,
    indexed,
    skipped,
    failed,
    message: total > 0 ? 'Generating embeddings' : 'Nothing to index',
  });

  for (let offset = 0; offset < toEmbed.length; offset += BATCH_SIZE) {
    if (options.jobRunId) {
      await assertJobActive(prisma, options.jobRunId);
    }

    const batch = toEmbed.slice(offset, offset + BATCH_SIZE);
    try {
      const embeddings = await embedTexts(batch.map((row) => row.text));

      for (let index = 0; index < batch.length; index += 1) {
        const row = batch[index]!;
        const embedding = embeddings[index]!;
        await upsertEmbedding(
          prisma,
          {
            ...row,
            model: config.embeddingModel,
            values: embedding.values,
          },
          options.newUuidV7,
        );
        indexed += 1;
      }
    } catch {
      failed += batch.length;
    }

    await options.onProgress?.({
      done: Math.min(offset + batch.length, total),
      total,
      indexed,
      skipped,
      failed,
      currentLabel: batch[batch.length - 1]?.label ?? null,
      message: `Indexed ${indexed}/${total}`,
    });
  }

  return {
    indexed,
    skipped,
    failed,
    model: config.embeddingModel,
  };
}
