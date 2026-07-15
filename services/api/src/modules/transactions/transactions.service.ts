import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AnalyticsEvent, initAnalytics, trackEvent } from '@cardwise/analytics';
import {
  normalizeTransactionCategorySlug,
  parseCreateTransactionInput,
  parseImportTransactionsInput,
  parseListTransactionsQuery,
  parsePatchTransactionInput,
  type TransactionDetail,
  type TransactionImportResult,
  type TransactionListResponse,
} from '@cardwise/validation';
import type { Prisma, Transaction } from '@prisma/client';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { resolveMerchantContext } from './transactions-categorization';
import { parseTransactionsCsv } from './transactions-csv';
import {
  categoryLabel,
  mapTransactionDetail,
  mapTransactionSummary,
  type UserCardWithCard,
} from './transactions.mapper';

@Injectable()
export class TransactionsService {
  private analyticsReady = false;

  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, rawQuery: unknown): Promise<TransactionListResponse> {
    await this.requireActiveUser(userId);
    const query = parseListTransactionsQuery(rawQuery ?? {});

    if (query.userCardId) {
      await this.requireUserCard(userId, query.userCardId);
    }

    const where = this.buildWhere(userId, query);
    const skip = (query.page - 1) * query.pageSize;

    const [rows, total, aggregate] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { transactedAt: 'desc' },
        skip,
        take: query.pageSize,
        include: {
          userCard: {
            include: {
              creditCard: { include: { bank: true } },
            },
          },
        },
      }),
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.groupBy({
        by: ['categorySlug'],
        where,
        _count: { _all: true },
        _sum: { amountInr: true },
      }),
    ]);

    const totalVolumeInr = aggregate.reduce((sum, row) => sum + Number(row._sum.amountInr ?? 0), 0);

    this.trackTimelineViewed(userId, rows.length);

    return {
      items: rows.map((row) => mapTransactionSummary(row, row.userCard)),
      total,
      page: query.page,
      pageSize: query.pageSize,
      summary: {
        totalVolumeInr: Math.round(totalVolumeInr * 100) / 100,
        transactionCount: total,
        categoryCounts: aggregate
          .map((row) => ({
            slug: row.categorySlug,
            label: categoryLabel(row.categorySlug),
            count: row._count._all,
          }))
          .sort((a, b) => b.count - a.count),
      },
    };
  }

  async getById(userId: string, transactionId: string): Promise<TransactionDetail> {
    await this.requireActiveUser(userId);

    const row = await this.prisma.transaction.findFirst({
      where: { id: transactionId, userId },
      include: {
        userCard: {
          include: {
            creditCard: { include: { bank: true } },
          },
        },
      },
    });

    if (!row) throw new NotFoundException('Transaction not found');
    return mapTransactionDetail(row, row.userCard);
  }

  async create(userId: string, raw: unknown): Promise<TransactionDetail> {
    await this.requireActiveUser(userId);
    const input = parseCreateTransactionInput(raw);
    await this.requireUserCard(userId, input.userCardId);

    if (input.externalRef) {
      const existing = await this.prisma.transaction.findUnique({
        where: {
          userId_externalRef: { userId, externalRef: input.externalRef },
        },
      });
      if (existing) {
        throw new BadRequestException('A transaction with this reference already exists');
      }
    }

    const merchant = await resolveMerchantContext(
      this.prisma,
      input.merchantName,
      input.categorySlug,
    );

    const row = await this.prisma.transaction.create({
      data: {
        userId,
        userCardId: input.userCardId,
        amountInr: input.amountInr,
        merchantName: merchant.merchantName,
        merchantId: merchant.merchantId,
        merchantSlug: merchant.merchantSlug,
        categorySlug: input.categorySlug
          ? normalizeTransactionCategorySlug(input.categorySlug)
          : merchant.categorySlug,
        status: input.status,
        source: 'MANUAL',
        externalRef: input.externalRef ?? null,
        notes: input.notes ?? null,
        tags: input.tags ?? [],
        transactedAt: new Date(input.transactedAt),
      },
      include: {
        userCard: {
          include: {
            creditCard: { include: { bank: true } },
          },
        },
      },
    });

    return mapTransactionDetail(row, row.userCard);
  }

  async importCsv(userId: string, raw: unknown): Promise<TransactionImportResult> {
    await this.requireActiveUser(userId);
    const input = parseImportTransactionsInput(raw);
    const parsed = parseTransactionsCsv(input.csv, input.defaultUserCardId);

    if (parsed.rows.length === 0 && parsed.errors.length > 0) {
      return { imported: 0, skipped: 0, errors: parsed.errors };
    }

    const cardIds = [
      ...new Set(parsed.rows.map((row) => row.userCardId).filter(Boolean)),
    ] as string[];
    const cards = await this.prisma.userCard.findMany({
      where: { userId, id: { in: cardIds }, status: { not: 'REMOVED' } },
      select: { id: true },
    });
    const validCardIds = new Set(cards.map((card) => card.id));

    let imported = 0;
    let skipped = 0;
    const errors = [...parsed.errors];

    for (const row of parsed.rows) {
      if (!validCardIds.has(row.userCardId!)) {
        errors.push({ line: row.line, message: 'Portfolio card not found' });
        skipped += 1;
        continue;
      }

      if (row.externalRef) {
        const existing = await this.prisma.transaction.findUnique({
          where: {
            userId_externalRef: { userId, externalRef: row.externalRef },
          },
        });
        if (existing) {
          skipped += 1;
          continue;
        }
      }

      try {
        const merchant = await resolveMerchantContext(
          this.prisma,
          row.merchantName,
          row.categorySlug,
        );

        await this.prisma.transaction.create({
          data: {
            userId,
            userCardId: row.userCardId!,
            amountInr: row.amountInr,
            merchantName: merchant.merchantName,
            merchantId: merchant.merchantId,
            merchantSlug: merchant.merchantSlug,
            categorySlug: merchant.categorySlug,
            status: row.status,
            source: 'CSV_IMPORT',
            externalRef: row.externalRef,
            transactedAt: row.transactedAt,
          },
        });
        imported += 1;
      } catch {
        errors.push({ line: row.line, message: 'Could not import row' });
        skipped += 1;
      }
    }

    this.trackImported(userId, imported, skipped);

    return { imported, skipped, errors: errors.slice(0, 20) };
  }

  async patch(userId: string, transactionId: string, raw: unknown): Promise<TransactionDetail> {
    await this.requireActiveUser(userId);
    const input = parsePatchTransactionInput(raw);

    const existing = await this.prisma.transaction.findFirst({
      where: { id: transactionId, userId },
    });
    if (!existing) throw new NotFoundException('Transaction not found');

    const row = await this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        categorySlug: input.categorySlug
          ? normalizeTransactionCategorySlug(input.categorySlug)
          : undefined,
        notes: input.notes === undefined ? undefined : input.notes,
        tags: input.tags,
        status: input.status,
      },
      include: {
        userCard: {
          include: {
            creditCard: { include: { bank: true } },
          },
        },
      },
    });

    return mapTransactionDetail(row, row.userCard);
  }

  private buildWhere(
    userId: string,
    query: ReturnType<typeof parseListTransactionsQuery>,
  ): Prisma.TransactionWhereInput {
    const where: Prisma.TransactionWhereInput = { userId };

    if (query.userCardId) where.userCardId = query.userCardId;
    if (query.categorySlug) where.categorySlug = query.categorySlug;
    if (query.status) where.status = query.status;

    if (query.startDate || query.endDate) {
      where.transactedAt = {};
      if (query.startDate) where.transactedAt.gte = new Date(query.startDate);
      if (query.endDate) where.transactedAt.lte = new Date(query.endDate);
    }

    if (query.search?.trim()) {
      where.OR = [
        { merchantName: { contains: query.search.trim(), mode: 'insensitive' } },
        { notes: { contains: query.search.trim(), mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private trackTimelineViewed(userId: string, visibleTransactions: number): void {
    this.ensureAnalytics();
    trackEvent(
      AnalyticsEvent.TRANSACTIONS_VIEWED,
      { visibleTransactions, source: 'WEB' },
      { distinctId: userId },
    );
  }

  private trackImported(userId: string, imported: number, skipped: number): void {
    this.ensureAnalytics();
    trackEvent(
      AnalyticsEvent.TRANSACTIONS_IMPORTED,
      { imported, skipped, source: 'CSV' },
      { distinctId: userId },
    );
  }

  private ensureAnalytics(): void {
    if (this.analyticsReady) return;
    initAnalytics({
      useMemory: process.env.NODE_ENV !== 'production' || !process.env.POSTHOG_API_KEY,
    });
    this.analyticsReady = true;
  }

  private async requireUserCard(userId: string, userCardId: string): Promise<UserCardWithCard> {
    const card = await this.prisma.userCard.findFirst({
      where: { id: userCardId, userId, status: { not: 'REMOVED' } },
      include: {
        creditCard: { include: { bank: true } },
      },
    });
    if (!card) throw new NotFoundException('Portfolio card not found');
    return card;
  }

  private async requireActiveUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.accountStatus !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }
  }
}

export type { Transaction };
