import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AnalyticsEvent, initAnalytics, trackEvent } from '@cardwise/analytics';
import {
  parseBillingCalendarQuery,
  parseCreateStatementInput,
  parseListBillsQuery,
  parseListStatementsQuery,
  parsePatchStatementInput,
  parseRecordBillPaymentInput,
  type BillingCalendarResponse,
  type BillDetail,
  type BillListResponse,
  type StatementDetail,
  type StatementListResponse,
} from '@cardwise/validation';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  computeBillingCycle,
  dateAtUtcDay,
  nextOccurrenceOfDay,
  parseUpcomingBillId,
  resolveStatementStatus,
} from './billing-dates';
import {
  mapBillDetail,
  mapBillPaymentRecord,
  mapStatementBill,
  mapStatementDetail,
  mapStatementSummary,
  mapUpcomingBill,
  type CardContext,
} from './billing.mapper';

@Injectable()
export class BillingService {
  private analyticsReady = false;

  constructor(private readonly prisma: PrismaService) {}

  async listStatements(userId: string, rawQuery: unknown): Promise<StatementListResponse> {
    await this.requireActiveUser(userId);
    const query = parseListStatementsQuery(rawQuery ?? {});
    const where = this.buildStatementWhere(userId, query);
    const skip = (query.page - 1) * query.pageSize;

    const [rows, total] = await Promise.all([
      this.prisma.creditCardStatement.findMany({
        where,
        orderBy: { statementDate: 'desc' },
        skip,
        take: query.pageSize,
        include: { userCard: { include: { creditCard: { include: { bank: true } } } } },
      }),
      this.prisma.creditCardStatement.count({ where }),
    ]);

    const items = await Promise.all(
      rows.map(async (row) => {
        const stats = await this.transactionStats(
          userId,
          row.userCardId,
          row.periodStart,
          row.periodEnd,
        );
        return mapStatementSummary({
          row,
          card: row.userCard,
          transactionCount: stats.count,
          spendInPeriodInr: stats.volumeInr,
        });
      }),
    );

    this.trackEvent(userId, AnalyticsEvent.STATEMENTS_VIEWED, { count: items.length });
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async getStatement(userId: string, statementId: string): Promise<StatementDetail> {
    await this.requireActiveUser(userId);
    const row = await this.prisma.creditCardStatement.findFirst({
      where: { id: statementId, userId },
      include: {
        userCard: { include: { creditCard: { include: { bank: true } } } },
        payments: { orderBy: { paidAt: 'desc' } },
      },
    });
    if (!row) throw new NotFoundException('Statement not found');

    const stats = await this.transactionStats(
      userId,
      row.userCardId,
      row.periodStart,
      row.periodEnd,
    );
    const paymentsRecordedInr = row.payments.reduce(
      (sum, payment) => sum + Number(payment.amountInr),
      0,
    );

    return mapStatementDetail({
      row,
      card: row.userCard,
      transactionCount: stats.count,
      spendInPeriodInr: stats.volumeInr,
      paymentsRecordedInr,
    });
  }

  async createStatement(userId: string, raw: unknown): Promise<StatementDetail> {
    await this.requireActiveUser(userId);
    const input = parseCreateStatementInput(raw);
    await this.requireUserCard(userId, input.userCardId);

    const periodStart = new Date(input.periodStart);
    const periodEnd = new Date(input.periodEnd);
    if (periodStart >= periodEnd) {
      throw new BadRequestException('periodStart must be before periodEnd');
    }

    const row = await this.prisma.creditCardStatement.create({
      data: {
        userId,
        userCardId: input.userCardId,
        periodStart,
        periodEnd,
        statementDate: new Date(input.statementDate),
        dueDate: new Date(input.dueDate),
        totalAmountInr: input.totalAmountInr,
        minimumDueInr: input.minimumDueInr,
        previousBalanceInr: input.previousBalanceInr ?? null,
        creditsInr: input.creditsInr ?? null,
        paymentsInr: input.paymentsInr ?? null,
        notes: input.notes ?? null,
      },
      include: {
        userCard: { include: { creditCard: { include: { bank: true } } } },
        payments: true,
      },
    });

    this.trackEvent(userId, AnalyticsEvent.STATEMENT_CREATED, { userCardId: input.userCardId });
    const stats = await this.transactionStats(
      userId,
      row.userCardId,
      row.periodStart,
      row.periodEnd,
    );
    return mapStatementDetail({
      row,
      card: row.userCard,
      transactionCount: stats.count,
      spendInPeriodInr: stats.volumeInr,
      paymentsRecordedInr: 0,
    });
  }

  async patchStatement(
    userId: string,
    statementId: string,
    raw: unknown,
  ): Promise<StatementDetail> {
    await this.requireActiveUser(userId);
    const input = parsePatchStatementInput(raw);

    const existing = await this.prisma.creditCardStatement.findFirst({
      where: { id: statementId, userId },
    });
    if (!existing) throw new NotFoundException('Statement not found');

    const row = await this.prisma.creditCardStatement.update({
      where: { id: statementId },
      data: {
        totalAmountInr: input.totalAmountInr,
        minimumDueInr: input.minimumDueInr,
        previousBalanceInr: input.previousBalanceInr,
        creditsInr: input.creditsInr,
        paymentsInr: input.paymentsInr,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        status: input.status,
        notes: input.notes,
      },
      include: {
        userCard: { include: { creditCard: { include: { bank: true } } } },
        payments: { orderBy: { paidAt: 'desc' } },
      },
    });

    const stats = await this.transactionStats(
      userId,
      row.userCardId,
      row.periodStart,
      row.periodEnd,
    );
    const paymentsRecordedInr = row.payments.reduce(
      (sum, payment) => sum + Number(payment.amountInr),
      0,
    );
    return mapStatementDetail({
      row,
      card: row.userCard,
      transactionCount: stats.count,
      spendInPeriodInr: stats.volumeInr,
      paymentsRecordedInr,
    });
  }

  async listBills(userId: string, rawQuery: unknown): Promise<BillListResponse> {
    await this.requireActiveUser(userId);
    const query = parseListBillsQuery(rawQuery ?? {});
    const cards = await this.loadActiveCards(userId, query.userCardId);
    const today = new Date();

    const statementWhere: Prisma.CreditCardStatementWhereInput = {
      userId,
      ...(query.userCardId ? { userCardId: query.userCardId } : {}),
      ...(query.includePaid ? {} : { status: { not: 'PAID' } }),
    };

    const statements = await this.prisma.creditCardStatement.findMany({
      where: statementWhere,
      orderBy: { dueDate: 'asc' },
      include: { userCard: { include: { creditCard: { include: { bank: true } } } } },
    });

    const items = await Promise.all(
      statements.map(async (row) => {
        const stats = await this.transactionStats(
          userId,
          row.userCardId,
          row.periodStart,
          row.periodEnd,
        );
        return mapStatementBill({
          row,
          card: row.userCard,
          estimatedSpendInr: stats.volumeInr,
          today,
        });
      }),
    );

    const coveredDueKeys = new Set(
      statements.map((row) => `${row.userCardId}:${row.dueDate.toISOString().slice(0, 10)}`),
    );

    for (const card of cards) {
      if (card.dueDay == null) continue;
      const dueDate = nextOccurrenceOfDay(card.dueDay, today);
      const key = `${card.id}:${dueDate.toISOString().slice(0, 10)}`;
      if (coveredDueKeys.has(key)) continue;

      const cycle =
        card.statementDay != null
          ? computeBillingCycle({
              statementDay: card.statementDay,
              dueDay: card.dueDay,
              referenceDate: today,
            })
          : null;

      const stats = cycle
        ? await this.transactionStats(userId, card.id, cycle.periodStart, today)
        : { count: 0, volumeInr: 0 };

      items.push(
        mapUpcomingBill({
          card,
          dueDate,
          estimatedSpendInr: stats.volumeInr > 0 ? stats.volumeInr : null,
          today,
        }),
      );
    }

    items.sort((a, b) => a.daysUntilDue - b.daysUntilDue);

    return {
      items,
      overdueCount: items.filter((item) => item.status === 'OVERDUE').length,
      upcomingCount: items.filter((item) => item.status === 'UPCOMING').length,
    };
  }

  async getBill(userId: string, billId: string): Promise<BillDetail> {
    await this.requireActiveUser(userId);
    const upcoming = parseUpcomingBillId(billId);

    if (upcoming) {
      const card = await this.requireUserCard(userId, upcoming.userCardId);
      const today = new Date();
      const cycle =
        card.statementDay != null && card.dueDay != null
          ? computeBillingCycle({
              statementDay: card.statementDay,
              dueDay: card.dueDay,
              referenceDate: today,
            })
          : null;
      const stats = cycle
        ? await this.transactionStats(userId, card.id, cycle.periodStart, today)
        : { count: 0, volumeInr: 0 };

      const bill = mapUpcomingBill({
        card,
        dueDate: upcoming.dueDate,
        estimatedSpendInr: stats.volumeInr > 0 ? stats.volumeInr : null,
        today,
      });
      return mapBillDetail({ bill, statement: null, payments: [] });
    }

    const statement = await this.getStatement(userId, billId);
    const bill = mapStatementBill({
      row: await this.prisma.creditCardStatement.findFirstOrThrow({
        where: { id: billId, userId },
      }),
      card: await this.requireUserCard(userId, statement.userCardId),
      estimatedSpendInr: statement.spendInPeriodInr,
    });

    const payments = await this.prisma.billPayment.findMany({
      where: { userId, statementId: billId },
      orderBy: { paidAt: 'desc' },
    });

    return mapBillDetail({
      bill,
      statement,
      payments: payments.map(mapBillPaymentRecord),
    });
  }

  async listBillPayments(userId: string, billId: string) {
    await this.requireActiveUser(userId);
    const upcoming = parseUpcomingBillId(billId);
    if (upcoming) return [];

    const statement = await this.prisma.creditCardStatement.findFirst({
      where: { id: billId, userId },
    });
    if (!statement) throw new NotFoundException('Bill not found');

    const payments = await this.prisma.billPayment.findMany({
      where: { userId, statementId: billId },
      orderBy: { paidAt: 'desc' },
    });
    return payments.map(mapBillPaymentRecord);
  }

  async recordPayment(userId: string, billId: string, raw: unknown) {
    await this.requireActiveUser(userId);
    if (parseUpcomingBillId(billId)) {
      throw new BadRequestException('Create a statement before recording a payment');
    }

    const input = parseRecordBillPaymentInput(raw);
    const statement = await this.prisma.creditCardStatement.findFirst({
      where: { id: billId, userId },
      include: { payments: true },
    });
    if (!statement) throw new NotFoundException('Bill not found');

    const payment = await this.prisma.billPayment.create({
      data: {
        userId,
        statementId: billId,
        amountInr: input.amountInr,
        paidAt: new Date(input.paidAt),
        status: input.status,
        notes: input.notes ?? null,
      },
    });

    const paidTotal =
      statement.payments.reduce((sum, row) => sum + Number(row.amountInr), 0) + input.amountInr;
    const totalDue = Number(statement.totalAmountInr);
    let status = statement.status;
    if (paidTotal >= totalDue) status = 'PAID';
    else if (paidTotal > 0) status = 'PARTIAL';
    else
      status = resolveStatementStatus({
        storedStatus: statement.status,
        dueDate: statement.dueDate,
      });

    await this.prisma.creditCardStatement.update({
      where: { id: billId },
      data: { status },
    });

    this.trackEvent(userId, AnalyticsEvent.BILL_PAYMENT_RECORDED, {
      statementId: billId,
      amountInr: input.amountInr,
    });

    return mapBillPaymentRecord(payment);
  }

  async getAutopayStatus(userId: string, billId: string) {
    await this.getBill(userId, billId);
    return {
      enabled: false,
      status: 'NOT_CONFIGURED' as const,
      method: null,
      nextPaymentAt: null,
    };
  }

  async getCalendar(userId: string, rawQuery: unknown): Promise<BillingCalendarResponse> {
    await this.requireActiveUser(userId);
    const query = parseBillingCalendarQuery(rawQuery ?? {});
    const cards = await this.loadActiveCards(userId);
    const bills = (await this.listBills(userId, { includePaid: true })).items;

    const daysInMonth = new Date(Date.UTC(query.year, query.month, 0)).getUTCDate();
    const days = [];

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = dateAtUtcDay(query.year, query.month - 1, day);
      const dateKey = date.toISOString().slice(0, 10);

      const dueBills = bills
        .filter((bill) => bill.dueDate.slice(0, 10) === dateKey)
        .map((bill) => ({
          billId: bill.id,
          cardName: bill.cardName,
          amountInr: bill.totalDueInr,
          status: bill.status,
        }));

      const statementDates = cards
        .filter((card) => card.statementDay === day)
        .map((card) => ({
          userCardId: card.id,
          cardName: card.nickname ?? card.creditCard.name,
        }));

      days.push({ date: dateKey, dueBills, statementDates });
    }

    this.trackEvent(userId, AnalyticsEvent.BILLING_CALENDAR_VIEWED, {
      year: query.year,
      month: query.month,
    });

    return { year: query.year, month: query.month, days };
  }

  private buildStatementWhere(
    userId: string,
    query: ReturnType<typeof parseListStatementsQuery>,
  ): Prisma.CreditCardStatementWhereInput {
    const where: Prisma.CreditCardStatementWhereInput = { userId };
    if (query.userCardId) where.userCardId = query.userCardId;

    if (query.year != null) {
      const month = query.month ?? 1;
      const start = dateAtUtcDay(query.year, month - 1, 1);
      const end = query.month
        ? dateAtUtcDay(query.year, month, 1)
        : dateAtUtcDay(query.year + 1, 0, 1);
      where.statementDate = { gte: start, lt: end };
    }

    return where;
  }

  private async transactionStats(
    userId: string,
    userCardId: string,
    periodStart: Date,
    periodEnd: Date,
  ) {
    const aggregate = await this.prisma.transaction.aggregate({
      where: {
        userId,
        userCardId,
        status: { not: 'FAILED' },
        transactedAt: { gte: periodStart, lte: periodEnd },
      },
      _count: { _all: true },
      _sum: { amountInr: true },
    });

    return {
      count: aggregate._count._all,
      volumeInr: Number(aggregate._sum.amountInr ?? 0),
    };
  }

  private async loadActiveCards(userId: string, userCardId?: string): Promise<CardContext[]> {
    return this.prisma.userCard.findMany({
      where: {
        userId,
        status: { not: 'REMOVED' },
        ...(userCardId ? { id: userCardId } : {}),
      },
      include: { creditCard: { include: { bank: true } } },
    });
  }

  private async requireUserCard(userId: string, userCardId: string): Promise<CardContext> {
    const card = await this.prisma.userCard.findFirst({
      where: { id: userCardId, userId, status: { not: 'REMOVED' } },
      include: { creditCard: { include: { bank: true } } },
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

  private trackEvent(
    userId: string,
    event: (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent],
    properties: Record<string, unknown>,
  ): void {
    if (!this.analyticsReady) {
      initAnalytics({
        useMemory: process.env.NODE_ENV !== 'production' || !process.env.POSTHOG_API_KEY,
      });
      this.analyticsReady = true;
    }
    trackEvent(event, properties as never, { distinctId: userId });
  }
}
