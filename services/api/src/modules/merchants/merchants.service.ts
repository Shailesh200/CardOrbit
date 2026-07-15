import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import {
  AnalyticsEvent,
  initAnalytics,
  trackEvent,
  trackMerchantDataGap,
} from '@cardwise/analytics';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  toMerchantCategoryDto,
  toMerchantDetailDto,
  toMerchantListItemDto,
  type MerchantCategoryDto,
  type MerchantDetailDto,
  type MerchantListItemDto,
  type MerchantSearchPageDto,
} from './merchants.mapper';
import { normalizeAlias } from './infrastructure/prisma-merchant.repository';

const POPULAR_MERCHANT_SLUGS = [
  'amazon',
  'swiggy',
  'zomato',
  'flipkart',
  'myntra',
  'bigbasket',
  'uber',
  'irctc',
  'makemytrip',
] as const;

@Injectable()
export class MerchantsService {
  private analyticsReady = false;

  constructor(private readonly prisma: PrismaService) {}

  private ensureAnalytics(): void {
    if (this.analyticsReady) return;
    initAnalytics({
      useMemory: process.env.NODE_ENV !== 'production' || !process.env.POSTHOG_API_KEY,
    });
    this.analyticsReady = true;
  }

  private async requireActiveUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.accountStatus !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }
    return user;
  }

  async listCategories(userId: string): Promise<MerchantCategoryDto[]> {
    await this.requireActiveUser(userId);
    const rows = await this.prisma.merchantCategory.findMany({
      where: {
        deletedAt: null,
        merchants: {
          some: {
            deletedAt: null,
            active: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    return rows.map(toMerchantCategoryDto);
  }

  async listPopular(userId: string): Promise<MerchantListItemDto[]> {
    await this.requireActiveUser(userId);
    const rows = await this.prisma.merchant.findMany({
      where: {
        slug: { in: [...POPULAR_MERCHANT_SLUGS] },
        deletedAt: null,
        active: true,
      },
      include: { primaryCategory: true },
    });
    const bySlug = new Map(rows.map((row) => [row.slug, row]));
    return POPULAR_MERCHANT_SLUGS.flatMap((slug) => {
      const row = bySlug.get(slug);
      return row ? [toMerchantListItemDto(row)] : [];
    });
  }

  async searchMerchants(
    userId: string,
    query: { q?: string; categorySlug?: string; offset?: number; limit?: number } = {},
  ): Promise<MerchantSearchPageDto> {
    await this.requireActiveUser(userId);

    const offset = Math.max(0, query.offset ?? 0);
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 50);
    const q = query.q?.trim() ?? '';
    const categorySlug = query.categorySlug?.trim() || undefined;

    let items: MerchantListItemDto[] = [];
    let total = 0;
    const searchStartedAt = Date.now();

    if (q) {
      const normalized = normalizeAlias(q);
      const likePattern = `%${normalized}%`;
      const rows = await this.prisma.$queryRaw<Array<{ id: string; total_count: bigint }>>`
        WITH matched AS (
          SELECT DISTINCT m.id
          FROM merchants.merchants m
          LEFT JOIN merchants.merchant_categories c
            ON c.id = m.primary_category_id AND c.deleted_at IS NULL
          LEFT JOIN merchants.merchant_aliases a
            ON a.merchant_id = m.id AND a.deleted_at IS NULL
          WHERE m.deleted_at IS NULL
            AND m.active = true
            AND (${categorySlug ?? null}::text IS NULL OR c.slug = ${categorySlug ?? null})
            AND (
              to_tsvector('simple', coalesce(m.name, '') || ' ' || coalesce(m.slug, ''))
                @@ plainto_tsquery('simple', ${q})
              OR a.normalized_alias = ${normalized}
              OR a.normalized_alias LIKE ${likePattern}
            )
        )
        SELECT m.id, COUNT(*) OVER()::bigint AS total_count
        FROM merchants.merchants m
        INNER JOIN matched ON matched.id = m.id
        ORDER BY m.name ASC
        OFFSET ${offset}
        LIMIT ${limit}
      `;

      total = rows.length > 0 ? Number(rows[0]!.total_count) : 0;
      if (rows.length > 0) {
        const merchants = await this.prisma.merchant.findMany({
          where: { id: { in: rows.map((row) => row.id) } },
          include: { primaryCategory: true },
        });
        const order = new Map(rows.map((row, index) => [row.id, index]));
        items = merchants
          .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
          .map(toMerchantListItemDto);
      }

      this.ensureAnalytics();
      const searchLatencyMs = Date.now() - searchStartedAt;
      trackEvent(
        AnalyticsEvent.MERCHANT_SEARCHED,
        { query: q, resultCount: total, searchFailed: total === 0, searchLatencyMs },
        { distinctId: userId },
      );
      if (total === 0) {
        trackMerchantDataGap(
          { gapType: 'failed_search', query: q, source: 'merchant_search' },
          { distinctId: userId },
        );
      }
    } else {
      const where = {
        deletedAt: null,
        active: true,
        ...(categorySlug ? { primaryCategory: { slug: categorySlug, deletedAt: null } } : {}),
      };

      const [merchants, count] = await Promise.all([
        this.prisma.merchant.findMany({
          where,
          include: { primaryCategory: true },
          orderBy: { name: 'asc' },
          skip: offset,
          take: limit,
        }),
        this.prisma.merchant.count({ where }),
      ]);

      total = count;
      items = merchants.map(toMerchantListItemDto);
    }

    const nextOffset = offset + items.length < total ? offset + items.length : null;
    return {
      items,
      total,
      hasMore: nextOffset !== null,
      nextOffset,
    };
  }

  async getMerchantBySlug(userId: string, slug: string): Promise<MerchantDetailDto> {
    await this.requireActiveUser(userId);

    const merchant = await this.prisma.merchant.findFirst({
      where: { slug, deletedAt: null, active: true },
      include: {
        primaryCategory: true,
        aliases: { where: { deletedAt: null }, orderBy: { alias: 'asc' } },
        _count: {
          select: {
            offerMerchants: { where: { deletedAt: null } },
          },
        },
      },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    const favorite = await this.prisma.favoriteMerchant.findUnique({
      where: { userId_merchantId: { userId, merchantId: merchant.id } },
      select: { id: true },
    });

    return toMerchantDetailDto(merchant, {
      isFavorite: Boolean(favorite),
      offerCount: merchant._count.offerMerchants,
    });
  }
}
