import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  initAnalytics,
  trackReportExported,
  trackReportsHubViewed,
  trackReportViewed,
} from '@cardwise/analytics';
import { FeatureFlag } from '@cardwise/feature-flags';
import {
  parseUserReportType,
  parseUserReportsQuery,
  type ReportSection,
  type UserReportExportResponse,
  type UserReportType,
  type UserReportsHub,
  type UserReportsQuery,
} from '@cardwise/validation';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CashbackService } from '../cashback/cashback.service';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import { MilestonesService } from '../milestones/milestones.service';
import { PremiumDashboardService } from '../premium-dashboard/premium-dashboard.service';
import { RewardWalletService } from '../reward-wallet/reward-wallet.service';
import { categoryLabel } from '../transactions/transactions.mapper';
import {
  buildCashbackSection,
  buildFeeAnalysisSection,
  buildReportsHub,
  buildRewardSection,
  buildSpendingSection,
  filterTxns,
  resolveReportWindow,
  sectionToCsv,
  sumVolume,
  type ReportTxnRow,
} from './reports.builder';

@Injectable()
export class ReportsService {
  private analyticsReady = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly featureFlags: FeatureFlagsService,
    private readonly cashback: CashbackService,
    private readonly rewardWallet: RewardWalletService,
    private readonly milestones: MilestonesService,
    private readonly premiumDashboard: PremiumDashboardService,
  ) {}

  async getHub(userId: string, rawQuery: unknown): Promise<UserReportsHub> {
    await this.requireActiveUser(userId);
    await this.requireReportsEnabled(userId);
    const query = parseUserReportsQuery(rawQuery);
    const window = resolveReportWindow(query);
    const txns = await this.loadTransactions(userId, window.previousFrom, window.to);

    const current = filterTxns(txns, window.from, window.to, query.userCardId);
    const previous = filterTxns(txns, window.previousFrom, window.previousTo, query.userCardId);

    const [cashbackDash, cashbackCategories, wallet, milestones, premium] =
      await Promise.allSettled([
        this.cashback.getDashboard(userId),
        this.cashback.getCategories(userId),
        this.rewardWallet.getOverview(userId),
        this.milestones.getSpendMilestones(userId),
        this.premiumDashboard.getOverview(userId),
      ]);

    const cashback =
      cashbackDash.status === 'fulfilled'
        ? cashbackDash.value
        : {
            totalEarnedInr: 0,
            pendingCashbackInr: 0,
            monthlyCashbackInr: 0,
          };
    const categories =
      cashbackCategories.status === 'fulfilled' ? cashbackCategories.value.categories : [];
    const walletOverview =
      wallet.status === 'fulfilled'
        ? wallet.value
        : {
            totalEstimatedValueInr: 0,
            totalAvailablePoints: 0,
            totalCashbackInr: 0,
            expiringSoon: [],
            cards: [],
          };
    const milestoneInProgress =
      milestones.status === 'fulfilled' ? milestones.value.inProgressCount : 0;
    const premiumOverview =
      premium.status === 'fulfilled'
        ? premium.value
        : {
            totalAnnualFeesInr: 0,
            portfolioNetRoiInr: 0,
            totalWalletValueInr: 0,
            cards: [],
            periodLabel: window.periodLabel,
          };

    const sections: ReportSection[] = [
      buildSpendingSection({
        type: 'monthly_spending',
        periodLabel: window.periodLabel,
        current,
        previous,
      }),
      buildSpendingSection({
        type: 'category_analysis',
        periodLabel: window.periodLabel,
        current,
        previous,
      }),
      buildCashbackSection({
        periodLabel:
          cashbackDash.status === 'fulfilled' ? cashbackDash.value.periodLabel : window.periodLabel,
        totalEarnedInr: cashback.totalEarnedInr,
        pendingCashbackInr: cashback.pendingCashbackInr,
        monthlyCashbackInr: cashback.monthlyCashbackInr,
        categories,
      }),
      buildRewardSection({
        periodLabel: 'Current balances',
        totalEstimatedValueInr: walletOverview.totalEstimatedValueInr,
        totalAvailablePoints: walletOverview.totalAvailablePoints,
        totalCashbackInr: walletOverview.totalCashbackInr,
        expiringSoonCount: walletOverview.expiringSoon.length,
        cards: walletOverview.cards.map((card) => ({
          userCardId: card.userCardId,
          cardName: card.cardName,
          bankName: card.bankName,
          totalEstimatedValueInr: card.totalEstimatedValueInr,
        })),
      }),
      buildFeeAnalysisSection({
        periodLabel: premiumOverview.periodLabel,
        totalAnnualFeesInr: premiumOverview.totalAnnualFeesInr,
        portfolioNetRoiInr: premiumOverview.portfolioNetRoiInr,
        totalWalletValueInr: premiumOverview.totalWalletValueInr,
        cards: premiumOverview.cards.map((card) => ({
          userCardId: card.userCardId,
          cardName: card.cardName,
          bankName: card.bankName,
          annualFeeInr: card.annualFeeInr,
          netRoiInr: card.netRoiInr,
        })),
      }),
    ];

    const hub = buildReportsHub({
      generatedAt: new Date().toISOString(),
      periodLabel: window.periodLabel,
      spendCurrent: sumVolume(current),
      spendPrevious: sumVolume(previous),
      cashbackEarnedInr: cashback.totalEarnedInr,
      walletValueInr: walletOverview.totalEstimatedValueInr,
      milestoneInProgress,
      sections,
    });

    this.trackHub(userId, {
      period: String(window.period),
      sectionCount: hub.sections.length,
      kpiCount: hub.kpis.length,
    });

    return hub;
  }

  async getReport(userId: string, typeRaw: string, rawQuery: unknown): Promise<ReportSection> {
    await this.requireActiveUser(userId);
    await this.requireReportsEnabled(userId);
    const type = parseUserReportType(typeRaw);
    if (type === 'hub') {
      throw new BadRequestException('Use GET /reports for the hub overview');
    }

    const query = parseUserReportsQuery(rawQuery);
    const section = await this.buildTypedSection(userId, type, query);

    this.trackReport(userId, {
      reportType: type,
      period: query.period,
    });

    return section;
  }

  async exportReport(
    userId: string,
    typeRaw: string,
    rawQuery: unknown,
  ): Promise<UserReportExportResponse> {
    await this.requireActiveUser(userId);
    await this.requireReportsEnabled(userId);
    const type = parseUserReportType(typeRaw);
    if (type === 'hub') {
      throw new BadRequestException('Export a specific report type, not hub');
    }

    const query = parseUserReportsQuery(rawQuery);
    const section = await this.buildTypedSection(userId, type, query);
    const generatedAt = new Date().toISOString();
    const filename = `cardwise-${type}-${generatedAt.slice(0, 10)}.csv`;

    this.trackExport(userId, { reportType: type, format: 'csv' });

    return {
      type,
      format: 'csv',
      filename,
      contentType: 'text/csv; charset=utf-8',
      content: sectionToCsv(section),
      generatedAt,
    };
  }

  private async buildTypedSection(
    userId: string,
    type: Exclude<UserReportType, 'hub'>,
    query: UserReportsQuery,
  ): Promise<ReportSection> {
    const window = resolveReportWindow(query);

    if (
      type === 'monthly_spending' ||
      type === 'category_analysis' ||
      type === 'merchant_analysis' ||
      type === 'issuer_comparison'
    ) {
      const txns = await this.loadTransactions(userId, window.previousFrom, window.to);
      const current = filterTxns(txns, window.from, window.to, query.userCardId);
      const previous = filterTxns(txns, window.previousFrom, window.previousTo, query.userCardId);
      return buildSpendingSection({
        type,
        periodLabel: window.periodLabel,
        current,
        previous,
      });
    }

    if (type === 'cashback_summary') {
      const [dashboard, categories] = await Promise.all([
        this.cashback.getDashboard(userId),
        this.cashback.getCategories(userId),
      ]);
      return buildCashbackSection({
        periodLabel: dashboard.periodLabel,
        totalEarnedInr: dashboard.totalEarnedInr,
        pendingCashbackInr: dashboard.pendingCashbackInr,
        monthlyCashbackInr: dashboard.monthlyCashbackInr,
        categories: categories.categories,
      });
    }

    if (type === 'reward_summary') {
      const wallet = await this.rewardWallet.getOverview(userId);
      return buildRewardSection({
        periodLabel: 'Current balances',
        totalEstimatedValueInr: wallet.totalEstimatedValueInr,
        totalAvailablePoints: wallet.totalAvailablePoints,
        totalCashbackInr: wallet.totalCashbackInr,
        expiringSoonCount: wallet.expiringSoon.length,
        cards: wallet.cards.map((card) => ({
          userCardId: card.userCardId,
          cardName: card.cardName,
          bankName: card.bankName,
          totalEstimatedValueInr: card.totalEstimatedValueInr,
        })),
      });
    }

    const premium = await this.premiumDashboard.getOverview(userId);
    return buildFeeAnalysisSection({
      periodLabel: premium.periodLabel,
      totalAnnualFeesInr: premium.totalAnnualFeesInr,
      portfolioNetRoiInr: premium.portfolioNetRoiInr,
      totalWalletValueInr: premium.totalWalletValueInr,
      cards: premium.cards.map((card) => ({
        userCardId: card.userCardId,
        cardName: card.cardName,
        bankName: card.bankName,
        annualFeeInr: card.annualFeeInr,
        netRoiInr: card.netRoiInr,
      })),
    });
  }

  private async loadTransactions(userId: string, from: Date, to: Date): Promise<ReportTxnRow[]> {
    const rows = await this.prisma.transaction.findMany({
      where: {
        userId,
        status: { not: 'FAILED' },
        transactedAt: { gte: from, lte: to },
      },
      orderBy: { transactedAt: 'desc' },
      include: {
        userCard: {
          include: {
            creditCard: { include: { bank: true } },
          },
        },
      },
      take: 5000,
    });

    return rows.map((row) => ({
      id: row.id,
      userCardId: row.userCardId,
      amountInr: Number(row.amountInr),
      merchantName: row.merchantName,
      categorySlug: row.categorySlug,
      categoryLabel: categoryLabel(row.categorySlug),
      bankName: row.userCard.creditCard.bank.name,
      cardName: row.userCard.nickname ?? row.userCard.creditCard.name,
      transactedAt: row.transactedAt,
    }));
  }

  private async requireReportsEnabled(userId: string) {
    const enabled = await this.featureFlags.isEnabled(FeatureFlag.USER_REPORTS, userId);
    if (!enabled) throw new NotFoundException('User reports are not enabled');
  }

  private async requireActiveUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.accountStatus !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }
    return user;
  }

  private trackHub(
    userId: string,
    properties: { period: string; sectionCount: number; kpiCount: number },
  ) {
    try {
      if (!this.analyticsReady) {
        initAnalytics({});
        this.analyticsReady = true;
      }
      trackReportsHubViewed(properties, { distinctId: userId });
    } catch {
      // ignore
    }
  }

  private trackReport(userId: string, properties: { reportType: string; period: string }) {
    try {
      if (!this.analyticsReady) {
        initAnalytics({});
        this.analyticsReady = true;
      }
      trackReportViewed(properties, { distinctId: userId });
    } catch {
      // ignore
    }
  }

  private trackExport(userId: string, properties: { reportType: string; format: 'csv' }) {
    try {
      if (!this.analyticsReady) {
        initAnalytics({});
        this.analyticsReady = true;
      }
      trackReportExported(properties, { distinctId: userId });
    } catch {
      // ignore
    }
  }
}
