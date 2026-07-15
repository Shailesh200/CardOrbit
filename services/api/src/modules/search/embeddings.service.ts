import { Injectable } from '@nestjs/common';
import { embedText, isAiConfigured, loadAiConfig } from '@cardwise/ai';
import { FeatureFlag } from '@cardwise/feature-flags';
import {
  formatVectorLiteral,
  hashSearchDocument,
  type SearchEntityType,
} from '@cardwise/validation';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { newUuidV7 } from '../../infrastructure/prisma/uuid';
import { AiService } from '../ai/ai.service';

@Injectable()
export class EmbeddingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {}

  async getIndexStats(): Promise<{
    model: string;
    cards: number;
    merchants: number;
    total: number;
  }> {
    const model = isAiConfigured() ? loadAiConfig().embeddingModel : 'text-embedding-004';
    const grouped = await this.prisma.searchEmbedding.groupBy({
      by: ['entityType'],
      where: { model },
      _count: { _all: true },
    });

    const cards = grouped.find((row) => row.entityType === 'CARD')?._count._all ?? 0;
    const merchants = grouped.find((row) => row.entityType === 'MERCHANT')?._count._all ?? 0;

    return { model, cards, merchants, total: cards + merchants };
  }

  async upsertQueryEmbedding(text: string): Promise<number[]> {
    const result = await embedText(text);
    return result.values;
  }

  async upsertEntityEmbedding(input: {
    entityType: 'CARD' | 'MERCHANT';
    entityId: string;
    text: string;
  }): Promise<void> {
    if (!isAiConfigured()) {
      throw new Error('AI is not configured');
    }

    const config = loadAiConfig();
    const embedding = await embedText(input.text);
    const vectorLiteral = formatVectorLiteral(embedding.values);
    const contentHash = hashSearchDocument(input.text);

    await this.prisma.$executeRawUnsafe(
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
      config.embeddingModel,
      contentHash,
      input.text,
      vectorLiteral,
    );
  }

  async isSemanticSearchAvailable(userId: string): Promise<boolean> {
    if (!(await this.ai.isFeatureEnabled(FeatureFlag.AI_SEARCH_ENABLED, userId))) {
      return false;
    }
    if (!isAiConfigured()) return false;

    const stats = await this.getIndexStats();
    return stats.total > 0;
  }

  entityTypesToDb(types: SearchEntityType[]): Array<'CARD' | 'MERCHANT'> {
    return types.map((type) => (type === 'card' ? 'CARD' : 'MERCHANT'));
  }
}
