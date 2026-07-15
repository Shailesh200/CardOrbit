import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  initAnalytics,
  trackMerchantFavorited,
  trackMerchantUnfavorited,
  trackSavedSearchCreated,
} from '@cardwise/analytics';
import {
  MAX_FAVORITE_MERCHANTS,
  MAX_SAVED_SEARCHES,
  type AddFavoriteMerchantInput,
  type CreateSavedSearchInput,
  type FavoriteMerchant,
  type SavedSearch,
  type UpdateSavedSearchInput,
} from '@cardwise/validation';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { rethrowPrismaUnique } from '../../infrastructure/prisma/prisma-errors';
import type { MerchantListItemDto } from './merchants.mapper';

@Injectable()
export class MerchantPreferencesService {
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

  private mapSavedSearch(row: {
    id: string;
    name: string;
    query: string;
    categorySlug: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): SavedSearch {
    return {
      id: row.id,
      name: row.name,
      query: row.query,
      categorySlug: row.categorySlug,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async listFavoriteMerchants(userId: string): Promise<FavoriteMerchant[]> {
    await this.requireActiveUser(userId);

    const rows = await this.prisma.favoriteMerchant.findMany({
      where: { userId },
      include: {
        merchant: { include: { primaryCategory: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_FAVORITE_MERCHANTS,
    });

    return rows
      .filter((row) => row.merchant.deletedAt === null && row.merchant.active)
      .map((row) => ({
        id: row.id,
        merchantId: row.merchantId,
        createdAt: row.createdAt.toISOString(),
        merchant: {
          id: row.merchant.id,
          name: row.merchant.name,
          slug: row.merchant.slug,
          category: row.merchant.primaryCategory
            ? {
                id: row.merchant.primaryCategory.id,
                name: row.merchant.primaryCategory.name,
                slug: row.merchant.primaryCategory.slug,
              }
            : null,
        },
      }));
  }

  async isFavoriteMerchant(userId: string, merchantId: string): Promise<boolean> {
    const row = await this.prisma.favoriteMerchant.findUnique({
      where: { userId_merchantId: { userId, merchantId } },
      select: { id: true },
    });
    return Boolean(row);
  }

  async addFavoriteMerchant(
    userId: string,
    input: AddFavoriteMerchantInput,
  ): Promise<FavoriteMerchant> {
    await this.requireActiveUser(userId);

    const merchant = input.merchantId
      ? await this.prisma.merchant.findFirst({
          where: { id: input.merchantId, deletedAt: null, active: true },
          include: { primaryCategory: true },
        })
      : await this.prisma.merchant.findFirst({
          where: { slug: input.slug, deletedAt: null, active: true },
          include: { primaryCategory: true },
        });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    const existing = await this.prisma.favoriteMerchant.findUnique({
      where: { userId_merchantId: { userId, merchantId: merchant.id } },
      include: { merchant: { include: { primaryCategory: true } } },
    });

    if (existing) {
      return {
        id: existing.id,
        merchantId: existing.merchantId,
        createdAt: existing.createdAt.toISOString(),
        merchant: {
          id: existing.merchant.id,
          name: existing.merchant.name,
          slug: existing.merchant.slug,
          category: existing.merchant.primaryCategory
            ? {
                id: existing.merchant.primaryCategory.id,
                name: existing.merchant.primaryCategory.name,
                slug: existing.merchant.primaryCategory.slug,
              }
            : null,
        },
      };
    }

    const count = await this.prisma.favoriteMerchant.count({ where: { userId } });
    if (count >= MAX_FAVORITE_MERCHANTS) {
      throw new BadRequestException(`Favorite merchant limit reached (${MAX_FAVORITE_MERCHANTS})`);
    }

    const created = await this.prisma.favoriteMerchant.create({
      data: { userId, merchantId: merchant.id },
      include: { merchant: { include: { primaryCategory: true } } },
    });

    this.ensureAnalytics();
    trackMerchantFavorited(
      {
        merchantId: created.merchantId,
        merchantSlug: created.merchant.slug,
        merchantName: created.merchant.name,
        source: 'web',
      },
      { distinctId: userId },
    );

    return {
      id: created.id,
      merchantId: created.merchantId,
      createdAt: created.createdAt.toISOString(),
      merchant: {
        id: created.merchant.id,
        name: created.merchant.name,
        slug: created.merchant.slug,
        category: created.merchant.primaryCategory
          ? {
              id: created.merchant.primaryCategory.id,
              name: created.merchant.primaryCategory.name,
              slug: created.merchant.primaryCategory.slug,
            }
          : null,
      },
    };
  }

  async removeFavoriteMerchant(userId: string, merchantId: string): Promise<void> {
    await this.requireActiveUser(userId);

    const row = await this.prisma.favoriteMerchant.findUnique({
      where: { userId_merchantId: { userId, merchantId } },
    });

    if (!row) {
      throw new NotFoundException('Favorite merchant not found');
    }

    const merchant = await this.prisma.merchant.findUnique({ where: { id: merchantId } });

    await this.prisma.favoriteMerchant.delete({ where: { id: row.id } });

    this.ensureAnalytics();
    trackMerchantUnfavorited(
      {
        merchantId,
        merchantSlug: merchant?.slug,
        merchantName: merchant?.name,
        source: 'web',
      },
      { distinctId: userId },
    );
  }

  async listSavedSearches(userId: string): Promise<SavedSearch[]> {
    await this.requireActiveUser(userId);

    const rows = await this.prisma.savedSearch.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: MAX_SAVED_SEARCHES,
    });

    return rows.map((row) => this.mapSavedSearch(row));
  }

  async createSavedSearch(userId: string, input: CreateSavedSearchInput): Promise<SavedSearch> {
    await this.requireActiveUser(userId);

    const count = await this.prisma.savedSearch.count({ where: { userId } });
    if (count >= MAX_SAVED_SEARCHES) {
      throw new BadRequestException(`Saved search limit reached (${MAX_SAVED_SEARCHES})`);
    }

    const query = input.query.trim();
    const categorySlug = input.categorySlug?.trim() || null;

    if (!query && !categorySlug) {
      throw new BadRequestException('Saved search must include a query or category filter');
    }

    try {
      const created = await this.prisma.savedSearch.create({
        data: {
          userId,
          name: input.name.trim(),
          query,
          categorySlug,
        },
      });

      this.ensureAnalytics();
      trackSavedSearchCreated(
        {
          savedSearchId: created.id,
          name: created.name,
          query: created.query,
          categorySlug: created.categorySlug,
        },
        { distinctId: userId },
      );

      return this.mapSavedSearch(created);
    } catch (error) {
      rethrowPrismaUnique(error, 'Saved search', 'name');
    }
  }

  async updateSavedSearch(
    userId: string,
    savedSearchId: string,
    input: UpdateSavedSearchInput,
  ): Promise<SavedSearch> {
    await this.requireActiveUser(userId);

    const existing = await this.prisma.savedSearch.findFirst({
      where: { id: savedSearchId, userId },
    });

    if (!existing) {
      throw new NotFoundException('Saved search not found');
    }

    const query = input.query !== undefined ? input.query.trim() : existing.query;
    const categorySlug =
      input.categorySlug !== undefined ? input.categorySlug?.trim() || null : existing.categorySlug;

    if (!query && !categorySlug) {
      throw new BadRequestException('Saved search must include a query or category filter');
    }

    try {
      const updated = await this.prisma.savedSearch.update({
        where: { id: existing.id },
        data: {
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.query !== undefined ? { query } : {}),
          ...(input.categorySlug !== undefined ? { categorySlug } : {}),
        },
      });
      return this.mapSavedSearch(updated);
    } catch (error) {
      rethrowPrismaUnique(error, 'Saved search', 'name');
    }
  }

  async deleteSavedSearch(userId: string, savedSearchId: string): Promise<void> {
    await this.requireActiveUser(userId);

    const existing = await this.prisma.savedSearch.findFirst({
      where: { id: savedSearchId, userId },
    });

    if (!existing) {
      throw new NotFoundException('Saved search not found');
    }

    await this.prisma.savedSearch.delete({ where: { id: existing.id } });
  }

  async listFavoriteMerchantSummaries(userId: string): Promise<MerchantListItemDto[]> {
    const favorites = await this.listFavoriteMerchants(userId);
    return favorites.map((row) => ({
      id: row.merchant.id,
      name: row.merchant.name,
      slug: row.merchant.slug,
      category: row.merchant.category,
      paymentMethods: ['CARD'],
      popularityScore: 0,
      tags: [],
    }));
  }
}
