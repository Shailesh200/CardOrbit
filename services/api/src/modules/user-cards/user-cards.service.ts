import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AnalyticsEvent, initAnalytics, trackEvent } from '@cardwise/analytics';
import { FeatureFlag } from '@cardwise/feature-flags';
import {
  parseAddUserCardInput,
  parsePatchUserCardInput,
  buildCatalogCardKeywordWhere,
  type AddUserCardInput,
  type PatchUserCardInput,
} from '@cardwise/validation';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import { MailSyncService } from '../mail-sync/mail-sync.service';
import {
  toCatalogCardDto,
  toPortfolioDetailDto,
  toPortfolioSummaryDto,
  type CatalogCardDto,
  type PortfolioCardDetailDto,
  type PortfolioCardSummaryDto,
} from './user-cards.mapper';

@Injectable()
export class UserCardsService {
  private analyticsReady = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly featureFlags: FeatureFlagsService,
    private readonly mailSync: MailSyncService,
  ) {}

  private ensureAnalytics(): void {
    if (this.analyticsReady) return;
    initAnalytics({
      useMemory: process.env.NODE_ENV !== 'production' || !process.env.POSTHOG_API_KEY,
    });
    this.analyticsReady = true;
  }

  private async ensurePortfolioEnabled(userId: string): Promise<void> {
    if (!(await this.featureFlags.isEnabled(FeatureFlag.PORTFOLIO_V1, userId))) {
      throw new NotFoundException('Portfolio is not available');
    }
  }

  private async requireActiveUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.accountStatus !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }
    return user;
  }

  async listCatalog(
    userId: string,
    query: {
      q?: string;
      bankSlug?: string;
      networkCode?: string;
      maxAnnualFeeInr?: number;
      category?: string;
      offset?: number;
      limit?: number;
    } = {},
  ): Promise<{
    items: CatalogCardDto[];
    total: number;
    hasMore: boolean;
    nextOffset: number | null;
  }> {
    await this.ensurePortfolioEnabled(userId);
    await this.requireActiveUser(userId);

    const offset = Math.max(0, query.offset ?? 0);
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 50);
    const networkCode = query.networkCode?.trim().toUpperCase();
    const category = query.category?.trim().toUpperCase();

    const where = {
      deletedAt: null,
      active: true,
      ...(query.bankSlug ? { bank: { slug: query.bankSlug, deletedAt: null } } : {}),
      ...(networkCode ? { network: { code: networkCode, deletedAt: null } } : {}),
      ...(query.maxAnnualFeeInr != null && Number.isFinite(query.maxAnnualFeeInr)
        ? { annualFeeInr: { lte: query.maxAnnualFeeInr } }
        : {}),
      ...(category
        ? {
            benefits: {
              some: {
                deletedAt: null,
                benefitType: { code: category, deletedAt: null },
              },
            },
          }
        : {}),
      ...(query.q ? buildCatalogCardKeywordWhere(query.q) : {}),
    };

    const [cards, total] = await Promise.all([
      this.prisma.creditCard.findMany({
        where,
        include: {
          bank: true,
          network: true,
          _count: { select: { benefits: { where: { deletedAt: null } } } },
        },
        orderBy: { name: 'asc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.creditCard.count({ where }),
    ]);

    const owned = await this.prisma.userCard.findMany({
      where: { userId },
      select: { id: true, creditCardId: true, status: true },
    });
    const ownedMap = new Map(owned.map((row) => [row.creditCardId, row]));

    const items = cards.map((card) => toCatalogCardDto(card, userId, ownedMap));
    const nextOffset = offset + items.length < total ? offset + items.length : null;

    return {
      items,
      total,
      hasMore: nextOffset !== null,
      nextOffset,
    };
  }

  async listPortfolio(userId: string): Promise<PortfolioCardSummaryDto[]> {
    await this.ensurePortfolioEnabled(userId);
    await this.requireActiveUser(userId);

    const rows = await this.prisma.userCard.findMany({
      where: { userId, status: { not: 'REMOVED' } },
      include: {
        creditCard: {
          include: {
            bank: true,
            network: true,
            benefits: {
              where: { deletedAt: null },
              orderBy: { title: 'asc' },
              take: 3,
            },
          },
        },
      },
      orderBy: [{ isFavorite: 'desc' }, { addedAt: 'desc' }],
    });

    return rows.map(toPortfolioSummaryDto);
  }

  async getPortfolioCard(userId: string, userCardId: string): Promise<PortfolioCardDetailDto> {
    await this.ensurePortfolioEnabled(userId);
    await this.requireActiveUser(userId);

    const row = await this.prisma.userCard.findFirst({
      where: { id: userCardId, userId, status: { not: 'REMOVED' } },
      include: {
        creditCard: {
          include: {
            bank: true,
            network: true,
            benefits: {
              where: { deletedAt: null },
              orderBy: { title: 'asc' },
              include: { benefitType: true },
            },
            fees: { where: { deletedAt: null } },
          },
        },
      },
    });

    if (!row) throw new NotFoundException('Card not found in portfolio');
    return toPortfolioDetailDto(row);
  }

  async addCard(userId: string, raw: unknown): Promise<PortfolioCardDetailDto> {
    await this.ensurePortfolioEnabled(userId);
    await this.requireActiveUser(userId);

    let input: AddUserCardInput;
    try {
      input = parseAddUserCardInput(raw);
    } catch {
      throw new BadRequestException('Invalid add card payload');
    }

    const catalogCard = await this.prisma.creditCard.findFirst({
      where: { id: input.creditCardId, deletedAt: null, active: true },
      include: { bank: true },
    });
    if (!catalogCard) throw new NotFoundException('Catalog card not found');

    const existing = await this.prisma.userCard.findUnique({
      where: {
        userId_creditCardId: { userId, creditCardId: input.creditCardId },
      },
    });

    this.ensureAnalytics();

    if (existing) {
      if (existing.status !== 'REMOVED') {
        throw new ConflictException('Card is already in your portfolio');
      }

      const reactivated = await this.prisma.userCard.update({
        where: { id: existing.id },
        data: {
          status: 'ACTIVE',
          removedAt: null,
          nickname: input.nickname ?? existing.nickname,
          addedAt: new Date(),
        },
        include: {
          creditCard: {
            include: {
              bank: true,
              network: true,
              benefits: {
                where: { deletedAt: null },
                orderBy: { title: 'asc' },
                include: { benefitType: true },
              },
              fees: { where: { deletedAt: null } },
            },
          },
        },
      });

      trackEvent(
        AnalyticsEvent.CARD_ADDED,
        { cardId: catalogCard.id, bankId: catalogCard.bankId, source: 'reactivate' },
        { distinctId: userId },
      );

      void this.mailSync.enqueueSyncAfterCardAdd(userId, reactivated.id);

      return toPortfolioDetailDto(reactivated);
    }

    const created = await this.prisma.userCard.create({
      data: {
        userId,
        creditCardId: input.creditCardId,
        nickname: input.nickname ?? null,
      },
      include: {
        creditCard: {
          include: {
            bank: true,
            network: true,
            benefits: {
              where: { deletedAt: null },
              orderBy: { title: 'asc' },
              include: { benefitType: true },
            },
            fees: { where: { deletedAt: null } },
          },
        },
      },
    });

    trackEvent(
      AnalyticsEvent.CARD_ADDED,
      { cardId: catalogCard.id, bankId: catalogCard.bankId, source: 'catalog' },
      { distinctId: userId },
    );

    void this.mailSync.enqueueSyncAfterCardAdd(userId, created.id);

    return toPortfolioDetailDto(created);
  }

  async patchCard(
    userId: string,
    userCardId: string,
    raw: unknown,
  ): Promise<PortfolioCardDetailDto> {
    await this.ensurePortfolioEnabled(userId);
    await this.requireActiveUser(userId);

    let input: PatchUserCardInput;
    try {
      input = parsePatchUserCardInput(raw);
    } catch {
      throw new BadRequestException('Invalid update payload');
    }

    const existing = await this.prisma.userCard.findFirst({
      where: { id: userCardId, userId, status: { not: 'REMOVED' } },
    });
    if (!existing) throw new NotFoundException('Card not found in portfolio');

    const updated = await this.prisma.userCard.update({
      where: { id: userCardId },
      data: {
        ...(input.nickname !== undefined ? { nickname: input.nickname } : {}),
        ...(input.isFavorite !== undefined ? { isFavorite: input.isFavorite } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.statementDay !== undefined ? { statementDay: input.statementDay } : {}),
        ...(input.dueDay !== undefined ? { dueDay: input.dueDay } : {}),
      },
      include: {
        creditCard: {
          include: {
            bank: true,
            network: true,
            benefits: {
              where: { deletedAt: null },
              orderBy: { title: 'asc' },
              include: { benefitType: true },
            },
            fees: { where: { deletedAt: null } },
          },
        },
      },
    });

    return toPortfolioDetailDto(updated);
  }

  async removeCard(userId: string, userCardId: string): Promise<{ ok: true }> {
    await this.ensurePortfolioEnabled(userId);
    await this.requireActiveUser(userId);

    const existing = await this.prisma.userCard.findFirst({
      where: { id: userCardId, userId, status: { not: 'REMOVED' } },
    });
    if (!existing) throw new NotFoundException('Card not found in portfolio');

    this.ensureAnalytics();

    await this.prisma.userCard.update({
      where: { id: userCardId },
      data: { status: 'REMOVED', removedAt: new Date() },
    });

    trackEvent(
      AnalyticsEvent.CARD_REMOVED,
      { cardId: existing.creditCardId },
      { distinctId: userId },
    );

    return { ok: true };
  }
}
