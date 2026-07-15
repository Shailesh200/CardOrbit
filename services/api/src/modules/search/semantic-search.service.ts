import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { isAiConfigured, loadAiConfig } from '@cardwise/ai';
import { FeatureFlag } from '@cardwise/feature-flags';
import {
  formatVectorLiteral,
  parseAiSearchQuery,
  buildCatalogCardKeywordWhere,
  catalogSearchTerms,
  type AiSearchQuery,
  type AiSearchResponse,
  type AiSearchResultItem,
  type SearchEntityType,
} from '@cardwise/validation';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { toMerchantListItemDto, type MerchantListItemDto } from '../merchants/merchants.mapper';
import { normalizeAlias } from '../merchants/infrastructure/prisma-merchant.repository';
import { toCatalogCardDto, type CatalogCardDto } from '../user-cards/user-cards.mapper';
import { EmbeddingsService } from './embeddings.service';

type SemanticRow = {
  entity_type: 'CARD' | 'MERCHANT';
  entity_id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  score: number;
};

export type AiSearchHydratedResponse = AiSearchResponse & {
  cards?: CatalogCardDto[];
  merchants?: MerchantListItemDto[];
};

@Injectable()
export class SemanticSearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly embeddings: EmbeddingsService,
  ) {}

  private async requireActiveUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.accountStatus !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }
    return user;
  }

  async search(
    userId: string,
    rawQuery: {
      q?: string;
      types?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<AiSearchHydratedResponse> {
    await this.requireActiveUser(userId);

    const query = parseAiSearchQuery(rawQuery);
    const types = query.types ?? ['card', 'merchant'];
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const semanticAvailable = await this.embeddings.isSemanticSearchAvailable(userId);
    let response: AiSearchResponse;
    if (semanticAvailable) {
      try {
        response = await this.searchSemantic(userId, query, types, limit, offset);
      } catch {
        response = await this.searchKeyword(query, types, limit, offset);
      }
    } else {
      response = await this.searchKeyword(query, types, limit, offset);
    }

    if (types.includes('card')) {
      response = await this.mergeBenefitKeywordCards(response, query, limit);
    }

    return this.hydrateSearchResponse(userId, response, types);
  }

  /** Boost cards whose benefits match the query (e.g. forex markup). */
  private async mergeBenefitKeywordCards(
    response: AiSearchResponse,
    query: AiSearchQuery,
    limit: number,
  ): Promise<AiSearchResponse> {
    const terms = catalogSearchTerms(query.q);
    if (terms.length === 0) return response;

    const benefitCards = await this.prisma.creditCard.findMany({
      where: {
        deletedAt: null,
        active: true,
        ...buildCatalogCardKeywordWhere(query.q),
      },
      include: { bank: true },
      take: limit,
    });

    if (benefitCards.length === 0) return response;

    const byId = new Map(response.items.map((item) => [item.id, item]));
    for (const card of benefitCards) {
      const existing = byId.get(card.id);
      if (existing) {
        byId.set(card.id, { ...existing, score: Math.max(existing.score, 0.92) });
      } else {
        byId.set(card.id, {
          entityType: 'card',
          id: card.id,
          slug: card.slug,
          name: card.name,
          subtitle: card.bank.name,
          score: 0.92,
        });
      }
    }

    const items = [...byId.values()].sort((a, b) => b.score - a.score).slice(0, limit);

    return {
      ...response,
      items,
      total: Math.max(response.total, items.length),
      hasMore: response.hasMore || items.length >= limit,
    };
  }

  private async hydrateSearchResponse(
    userId: string,
    response: AiSearchResponse,
    types: SearchEntityType[],
  ): Promise<AiSearchHydratedResponse> {
    const cardIds = response.items
      .filter((item) => item.entityType === 'card')
      .map((item) => item.id);
    const merchantIds = response.items
      .filter((item) => item.entityType === 'merchant')
      .map((item) => item.id);

    const [cards, merchants] = await Promise.all([
      types.includes('card') && cardIds.length > 0
        ? this.loadCatalogCards(userId, cardIds)
        : Promise.resolve([]),
      types.includes('merchant') && merchantIds.length > 0
        ? this.loadMerchants(merchantIds)
        : Promise.resolve([]),
    ]);

    const cardsById = new Map(cards.map((card) => [card.id, card]));
    const merchantsById = new Map(merchants.map((merchant) => [merchant.id, merchant]));

    return {
      ...response,
      ...(types.includes('card')
        ? { cards: cardIds.flatMap((id) => cardsById.get(id) ?? []) }
        : {}),
      ...(types.includes('merchant')
        ? { merchants: merchantIds.flatMap((id) => merchantsById.get(id) ?? []) }
        : {}),
    };
  }

  private async loadCatalogCards(userId: string, ids: string[]): Promise<CatalogCardDto[]> {
    const [cards, owned] = await Promise.all([
      this.prisma.creditCard.findMany({
        where: { id: { in: ids }, deletedAt: null, active: true },
        include: {
          bank: true,
          network: true,
          _count: { select: { benefits: { where: { deletedAt: null } } } },
        },
      }),
      this.prisma.userCard.findMany({
        where: { userId },
        select: { id: true, creditCardId: true, status: true },
      }),
    ]);

    const ownedMap = new Map(owned.map((row) => [row.creditCardId, row]));
    const byId = new Map(cards.map((card) => [card.id, toCatalogCardDto(card, userId, ownedMap)]));
    return ids.flatMap((id) => {
      const card = byId.get(id);
      return card ? [card] : [];
    });
  }

  private async loadMerchants(ids: string[]): Promise<MerchantListItemDto[]> {
    const merchants = await this.prisma.merchant.findMany({
      where: { id: { in: ids }, deletedAt: null, active: true },
      include: { primaryCategory: true },
    });

    const byId = new Map(
      merchants.map((merchant) => [merchant.id, toMerchantListItemDto(merchant)]),
    );
    return ids.flatMap((id) => {
      const merchant = byId.get(id);
      return merchant ? [merchant] : [];
    });
  }

  private async searchSemantic(
    userId: string,
    query: AiSearchQuery,
    types: SearchEntityType[],
    limit: number,
    offset: number,
  ): Promise<AiSearchResponse> {
    if (!(await this.ai.isFeatureEnabled(FeatureFlag.AI_SEARCH_ENABLED, userId))) {
      return this.searchKeyword(query, types, limit, offset);
    }

    const config = loadAiConfig();
    const queryVector = await this.embeddings.upsertQueryEmbedding(query.q);
    const vectorLiteral = formatVectorLiteral(queryVector);
    const dbTypes = this.embeddings.entityTypesToDb(types);

    const rows = await this.prisma.$queryRawUnsafe<SemanticRow[]>(
      `
      SELECT
        se.entity_type,
        se.entity_id,
        CASE
          WHEN se.entity_type = 'CARD' THEN cc.slug
          ELSE m.slug
        END AS slug,
        CASE
          WHEN se.entity_type = 'CARD' THEN cc.name
          ELSE m.name
        END AS name,
        CASE
          WHEN se.entity_type = 'CARD' THEN b.name
          ELSE c.name
        END AS subtitle,
        1 - (se.embedding <=> $1::vector) AS score
      FROM admin.search_embeddings se
      LEFT JOIN cards.credit_cards cc
        ON se.entity_type = 'CARD'
       AND cc.id = se.entity_id
       AND cc.deleted_at IS NULL
       AND cc.active = true
      LEFT JOIN cards.banks b
        ON b.id = cc.bank_id
       AND b.deleted_at IS NULL
      LEFT JOIN merchants.merchants m
        ON se.entity_type = 'MERCHANT'
       AND m.id = se.entity_id
       AND m.deleted_at IS NULL
       AND m.active = true
      LEFT JOIN merchants.merchant_categories c
        ON c.id = m.primary_category_id
       AND c.deleted_at IS NULL
      WHERE se.model = $2
        AND se.entity_type = ANY($3::admin."SearchEmbeddingEntityType"[])
        AND (cc.id IS NOT NULL OR m.id IS NOT NULL)
      ORDER BY se.embedding <=> $1::vector
      OFFSET $4
      LIMIT $5
      `,
      vectorLiteral,
      config.embeddingModel,
      dbTypes,
      offset,
      limit + 1,
    );

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const items: AiSearchResultItem[] = pageRows.map((row) => ({
      entityType: row.entity_type === 'CARD' ? 'card' : 'merchant',
      id: row.entity_id,
      slug: row.slug,
      name: row.name,
      subtitle: row.subtitle,
      score: Number(row.score),
    }));

    const total = offset + items.length + (hasMore ? 1 : 0);
    const nextOffset = hasMore ? offset + items.length : null;

    return {
      query: query.q,
      source: 'semantic',
      items,
      total,
      hasMore,
      nextOffset,
    };
  }

  private async searchKeyword(
    query: AiSearchQuery,
    types: SearchEntityType[],
    limit: number,
    offset: number,
  ): Promise<AiSearchResponse> {
    const items: AiSearchResultItem[] = [];

    if (types.includes('merchant')) {
      const normalized = normalizeAlias(query.q);
      const likePattern = `%${normalized}%`;
      const merchantRows = await this.prisma.$queryRaw<
        Array<{ id: string; slug: string; name: string; subtitle: string | null }>
      >`
        SELECT DISTINCT m.id, m.slug, m.name, c.name AS subtitle
        FROM merchants.merchants m
        LEFT JOIN merchants.merchant_categories c
          ON c.id = m.primary_category_id AND c.deleted_at IS NULL
        LEFT JOIN merchants.merchant_aliases a
          ON a.merchant_id = m.id AND a.deleted_at IS NULL
        WHERE m.deleted_at IS NULL
          AND m.active = true
          AND (
            to_tsvector('simple', coalesce(m.name, '') || ' ' || coalesce(m.slug, ''))
              @@ plainto_tsquery('simple', ${query.q})
            OR a.normalized_alias = ${normalized}
            OR a.normalized_alias LIKE ${likePattern}
          )
        ORDER BY m.name ASC
        LIMIT ${limit}
      `;

      for (const row of merchantRows) {
        items.push({
          entityType: 'merchant',
          id: row.id,
          slug: row.slug,
          name: row.name,
          subtitle: row.subtitle,
          score: 0.5,
        });
      }
    }

    if (types.includes('card')) {
      const cards = await this.prisma.creditCard.findMany({
        where: {
          deletedAt: null,
          active: true,
          ...buildCatalogCardKeywordWhere(query.q),
        },
        include: { bank: true },
        orderBy: { name: 'asc' },
        take: limit + offset,
      });

      for (const card of cards) {
        items.push({
          entityType: 'card',
          id: card.id,
          slug: card.slug,
          name: card.name,
          subtitle: card.bank.name,
          score: 0.5,
        });
      }
    }

    items.sort((a, b) => a.name.localeCompare(b.name));
    const page = items.slice(offset, offset + limit);
    const hasMore = offset + limit < items.length;
    const nextOffset = hasMore ? offset + page.length : null;

    return {
      query: query.q,
      source: 'keyword',
      items: page,
      total: items.length,
      hasMore,
      nextOffset,
    };
  }

  async getStatus(userId: string) {
    await this.requireActiveUser(userId);

    const flagEnabled = await this.ai.isFeatureEnabled(FeatureFlag.AI_SEARCH_ENABLED, userId);
    const configured = isAiConfigured();
    const stats = await this.embeddings.getIndexStats();

    return {
      enabled: flagEnabled,
      configured,
      indexed: stats,
      ready: flagEnabled && configured && stats.total > 0,
    };
  }
}
