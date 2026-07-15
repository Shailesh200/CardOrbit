import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import {
  initAnalytics,
  trackCalendarReminderCreated,
  trackFinancialCalendarViewed,
  trackFinancialTimelineViewed,
} from '@cardwise/analytics';
import { FeatureFlag } from '@cardwise/feature-flags';
import {
  parseCreateCalendarReminderInput,
  parseFinancialCalendarAgendaQuery,
  parseFinancialCalendarQuery,
  parseTimelineQuery,
  parseUpdateCalendarReminderInput,
  type CalendarReminder,
  type FinancialCalendarAgendaResponse,
  type FinancialCalendarEvent,
  type FinancialCalendarMonthResponse,
  type TimelineResponse,
} from '@cardwise/validation';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { BillingService } from '../billing/billing.service';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import { MilestonesService } from '../milestones/milestones.service';
import { OfferMatchingService } from '../offers/offer-matching.service';
import { RewardWalletService } from '../reward-wallet/reward-wallet.service';
import { TransactionsService } from '../transactions/transactions.service';
import { UserCardsService } from '../user-cards/user-cards.service';
import {
  bucketEventsByDay,
  countEventsByType,
  eventsInRange,
  filterEventsByType,
  mapBillDueEvents,
  mapFeeWaiverEndEvents,
  mapMilestoneEndEvents,
  mapOfferExpiryEvents,
  mapReminderEvents,
  mapRewardExpiryEvents,
  mapStatementDayEvents,
  mapTimelineFromSources,
  sortCalendarEvents,
} from './financial-calendar.builder';

@Injectable()
export class FinancialCalendarService {
  private analyticsReady = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly featureFlags: FeatureFlagsService,
    private readonly billing: BillingService,
    private readonly milestones: MilestonesService,
    private readonly rewardWallet: RewardWalletService,
    private readonly offerMatching: OfferMatchingService,
    private readonly userCards: UserCardsService,
    private readonly transactions: TransactionsService,
  ) {}

  async getMonth(userId: string, rawQuery: unknown): Promise<FinancialCalendarMonthResponse> {
    await this.requireActiveUser(userId);
    await this.requireCalendarEnabled(userId);
    const query = parseFinancialCalendarQuery(rawQuery);

    const allEvents = await this.collectEvents(userId, {
      year: query.year,
      month: query.month,
    });
    const filtered = filterEventsByType(allEvents, query.types);
    const monthPrefix = `${query.year}-${String(query.month).padStart(2, '0')}`;
    const inMonth = filtered.filter((event) => event.date.startsWith(monthPrefix));
    const days = bucketEventsByDay(query.year, query.month, inMonth);

    const todayKey = new Date().toISOString().slice(0, 10);
    const upcoming = sortCalendarEvents(filtered.filter((event) => event.date >= todayKey)).slice(
      0,
      12,
    );

    this.trackCalendarViewed(userId, {
      year: query.year,
      month: query.month,
      eventCount: inMonth.length,
      view: 'month',
    });

    return {
      year: query.year,
      month: query.month,
      days,
      upcoming,
      countsByType: countEventsByType(inMonth),
    };
  }

  async getAgenda(userId: string, rawQuery: unknown): Promise<FinancialCalendarAgendaResponse> {
    await this.requireActiveUser(userId);
    await this.requireCalendarEnabled(userId);
    const query = parseFinancialCalendarAgendaQuery(rawQuery);

    const now = new Date();
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const to = new Date(from.getTime() + query.days * 24 * 60 * 60 * 1000);
    const fromKey = from.toISOString().slice(0, 10);
    const toKey = to.toISOString().slice(0, 10);

    const allEvents = await this.collectEvents(userId, {
      year: from.getUTCFullYear(),
      month: from.getUTCMonth() + 1,
      spanUntil: to,
    });
    const items = eventsInRange(filterEventsByType(allEvents, query.types), fromKey, toKey);

    this.trackCalendarViewed(userId, {
      year: from.getUTCFullYear(),
      month: from.getUTCMonth() + 1,
      eventCount: items.length,
      view: 'agenda',
    });

    return {
      from: fromKey,
      to: toKey,
      items,
    };
  }

  async getTimeline(userId: string, rawQuery: unknown): Promise<TimelineResponse> {
    await this.requireActiveUser(userId);
    await this.requireCalendarEnabled(userId);
    const query = parseTimelineQuery(rawQuery);

    const [portfolio, transactions, statements, notifications, reminders] = await Promise.all([
      this.userCards.listPortfolio(userId).catch(() => []),
      this.transactions.list(userId, { page: 1, pageSize: 40 }).catch(() => ({
        items: [],
        total: 0,
        page: 1,
        pageSize: 40,
        summary: { totalVolumeInr: 0, transactionCount: 0, categoryCounts: [] },
      })),
      this.billing
        .listStatements(userId, {})
        .catch(() => ({ items: [], total: 0, page: 1, pageSize: 25 })),
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 40,
      }),
      this.listReminderModels(userId),
    ]);

    let items = mapTimelineFromSources({
      cards: portfolio.map((card) => ({
        id: card.id,
        cardName: card.nickname ?? card.card.name,
        addedAt: card.addedAt,
      })),
      transactions: transactions.items.map((row) => ({
        id: row.id,
        merchantName: row.merchantName,
        cardName: row.cardName,
        amountInr: row.amountInr,
        transactedAt: row.transactedAt,
      })),
      statements: statements.items.map((row) => ({
        id: row.id,
        cardName: row.cardName,
        statementDate: row.statementDate,
        totalAmountInr: row.totalAmountInr ?? null,
      })),
      notifications: notifications.map((row) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        body: row.body,
        linkUrl: row.linkUrl,
        createdAt: row.createdAt.toISOString(),
      })),
      reminders,
    });

    if (query.category) {
      items = items.filter((item) => item.category === query.category);
    }

    const total = items.length;
    const start = (query.page - 1) * query.pageSize;
    const pageItems = items.slice(start, start + query.pageSize);

    this.trackTimelineViewed(userId, {
      page: query.page,
      pageSize: query.pageSize,
      total,
      category: query.category,
    });

    return {
      items: pageItems,
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async listReminders(userId: string): Promise<CalendarReminder[]> {
    await this.requireActiveUser(userId);
    await this.requireCalendarEnabled(userId);
    return this.listReminderModels(userId);
  }

  async createReminder(userId: string, rawInput: unknown): Promise<CalendarReminder> {
    await this.requireActiveUser(userId);
    await this.requireCalendarEnabled(userId);
    const input = parseCreateCalendarReminderInput(rawInput);

    const row = await this.prisma.calendarReminder.create({
      data: {
        userId,
        title: input.title,
        description: input.description ?? null,
        eventDate: new Date(input.eventDate),
        reminderOffsetDays: input.reminderOffsetDays,
        priority: input.priority,
      },
    });

    this.trackReminderCreated(userId, {
      priority: input.priority,
      reminderOffsetDays: input.reminderOffsetDays,
    });

    return this.toReminderDto(row);
  }

  async updateReminder(
    userId: string,
    reminderId: string,
    rawInput: unknown,
  ): Promise<CalendarReminder> {
    await this.requireActiveUser(userId);
    await this.requireCalendarEnabled(userId);
    const input = parseUpdateCalendarReminderInput(rawInput);
    const existing = await this.prisma.calendarReminder.findFirst({
      where: { id: reminderId, userId },
    });
    if (!existing) throw new NotFoundException('Reminder not found');

    const row = await this.prisma.calendarReminder.update({
      where: { id: existing.id },
      data: {
        ...(input.title != null ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description ?? null } : {}),
        ...(input.eventDate != null ? { eventDate: new Date(input.eventDate) } : {}),
        ...(input.reminderOffsetDays != null
          ? { reminderOffsetDays: input.reminderOffsetDays }
          : {}),
        ...(input.priority != null ? { priority: input.priority } : {}),
      },
    });

    return this.toReminderDto(row);
  }

  async deleteReminder(userId: string, reminderId: string): Promise<{ deleted: true }> {
    await this.requireActiveUser(userId);
    await this.requireCalendarEnabled(userId);
    const existing = await this.prisma.calendarReminder.findFirst({
      where: { id: reminderId, userId },
    });
    if (!existing) throw new NotFoundException('Reminder not found');
    await this.prisma.calendarReminder.delete({ where: { id: existing.id } });
    return { deleted: true };
  }

  private async collectEvents(
    userId: string,
    window: { year: number; month: number; spanUntil?: Date },
  ): Promise<FinancialCalendarEvent[]> {
    const monthsToLoad = new Set<string>();
    monthsToLoad.add(`${window.year}-${window.month}`);
    if (window.spanUntil) {
      let cursor = new Date(Date.UTC(window.year, window.month - 1, 1));
      const end = new Date(
        Date.UTC(window.spanUntil.getUTCFullYear(), window.spanUntil.getUTCMonth(), 1),
      );
      while (cursor <= end) {
        monthsToLoad.add(`${cursor.getUTCFullYear()}-${cursor.getUTCMonth() + 1}`);
        cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
      }
    }

    const [billsResult, milestonesResult, feeWaiverResult, walletResult, offersResult, reminders] =
      await Promise.allSettled([
        this.billing.listBills(userId, { includePaid: true }),
        this.milestones.getSpendMilestones(userId),
        this.milestones.getAnnualFeeWaiver(userId),
        this.rewardWallet.getOverview(userId),
        this.offerMatching.matchOffers(userId, { limit: 20, status: 'active' }),
        this.listReminderModels(userId),
      ]);

    const bills = billsResult.status === 'fulfilled' ? billsResult.value.items : [];
    const milestones =
      milestonesResult.status === 'fulfilled' ? milestonesResult.value.spendMilestones : [];
    const feeWaivers = feeWaiverResult.status === 'fulfilled' ? feeWaiverResult.value.items : [];
    const wallet = walletResult.status === 'fulfilled' ? walletResult.value : null;
    const offers = offersResult.status === 'fulfilled' ? offersResult.value.items : [];
    const reminderRows = reminders.status === 'fulfilled' ? reminders.value : [];

    const cards = await this.prisma.userCard.findMany({
      where: { userId, status: { not: 'REMOVED' } },
      include: { creditCard: true },
    });

    const statementEvents: FinancialCalendarEvent[] = [];
    for (const key of monthsToLoad) {
      const [yearStr, monthStr] = key.split('-');
      const year = Number(yearStr);
      const month = Number(monthStr);
      statementEvents.push(
        ...mapStatementDayEvents(
          year,
          month,
          cards.map((card) => ({
            userCardId: card.id,
            cardName: card.nickname ?? card.creditCard.name,
            statementDay: card.statementDay,
          })),
        ),
      );
    }

    return [
      ...mapBillDueEvents(bills),
      ...statementEvents,
      ...mapMilestoneEndEvents(milestones),
      ...mapFeeWaiverEndEvents(feeWaivers),
      ...mapRewardExpiryEvents(wallet?.expiringSoon ?? []),
      ...mapOfferExpiryEvents(
        offers.map((offer) => ({
          id: offer.id,
          title: offer.title,
          validUntil: offer.validUntil,
          cashbackPercent: offer.cashbackPercent,
          merchantName: offer.merchants[0]?.name ?? null,
        })),
      ),
      ...mapReminderEvents(reminderRows),
    ];
  }

  private async listReminderModels(userId: string): Promise<CalendarReminder[]> {
    const rows = await this.prisma.calendarReminder.findMany({
      where: { userId },
      orderBy: { eventDate: 'asc' },
    });
    return rows.map((row) => this.toReminderDto(row));
  }

  private toReminderDto(row: {
    id: string;
    title: string;
    description: string | null;
    eventDate: Date;
    reminderOffsetDays: number;
    priority: string;
    createdAt: Date;
    updatedAt: Date;
  }): CalendarReminder {
    const priority =
      row.priority === 'high' || row.priority === 'low' || row.priority === 'medium'
        ? row.priority
        : 'medium';
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      eventDate: row.eventDate.toISOString(),
      reminderOffsetDays: row.reminderOffsetDays,
      priority,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async requireCalendarEnabled(userId: string) {
    const enabled = await this.featureFlags.isEnabled(FeatureFlag.FINANCIAL_CALENDAR, userId);
    if (!enabled) {
      throw new NotFoundException('Financial calendar is not enabled');
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

  private trackCalendarViewed(
    userId: string,
    properties: {
      year: number;
      month: number;
      eventCount: number;
      view: 'month' | 'agenda';
    },
  ) {
    try {
      if (!this.analyticsReady) {
        initAnalytics({});
        this.analyticsReady = true;
      }
      trackFinancialCalendarViewed(properties, { distinctId: userId });
    } catch {
      // ignore
    }
  }

  private trackTimelineViewed(
    userId: string,
    properties: {
      page: number;
      pageSize: number;
      total: number;
      category?: string;
    },
  ) {
    try {
      if (!this.analyticsReady) {
        initAnalytics({});
        this.analyticsReady = true;
      }
      trackFinancialTimelineViewed(properties, { distinctId: userId });
    } catch {
      // ignore
    }
  }

  private trackReminderCreated(
    userId: string,
    properties: { priority: 'high' | 'medium' | 'low'; reminderOffsetDays: number },
  ) {
    try {
      if (!this.analyticsReady) {
        initAnalytics({});
        this.analyticsReady = true;
      }
      trackCalendarReminderCreated(properties, { distinctId: userId });
    } catch {
      // ignore
    }
  }
}
