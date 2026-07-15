import type {
  ReportBreakdownRow,
  ReportComparison,
  ReportInsight,
  ReportKpi,
  ReportSection,
  UserReportPeriod,
  UserReportType,
  UserReportsHub,
  UserReportsQuery,
} from '@cardwise/validation';

export type ReportTxnRow = {
  id: string;
  userCardId: string;
  amountInr: number;
  merchantName: string;
  categorySlug: string | null;
  categoryLabel: string | null;
  bankName: string;
  cardName: string;
  transactedAt: Date;
};

export type ResolvedReportWindow = {
  from: Date;
  to: Date;
  previousFrom: Date;
  previousTo: Date;
  periodLabel: string;
  period: UserReportPeriod | 'custom';
};

const CATEGORY_LABELS: Record<string, string> = {
  dining: 'Dining',
  travel: 'Travel',
  groceries: 'Groceries',
  fuel: 'Fuel',
  online: 'Online shopping',
  shopping: 'Shopping',
  entertainment: 'Entertainment',
  utilities: 'Utilities',
  healthcare: 'Healthcare',
  education: 'Education',
  other: 'Other',
};

export function formatReportInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function resolveReportWindow(
  query: UserReportsQuery,
  now = new Date(),
): ResolvedReportWindow {
  if (query.from && query.to) {
    const from = new Date(query.from);
    const to = new Date(query.to);
    const spanMs = Math.max(to.getTime() - from.getTime(), 24 * 60 * 60 * 1000);
    const previousTo = new Date(from.getTime() - 1);
    const previousFrom = new Date(previousTo.getTime() - spanMs);
    return {
      from,
      to,
      previousFrom,
      previousTo,
      periodLabel: `${from.toISOString().slice(0, 10)} → ${to.toISOString().slice(0, 10)}`,
      period: 'custom',
    };
  }

  const to = now;
  let from: Date;
  let periodLabel: string;

  switch (query.period) {
    case '30d':
      from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
      periodLabel = 'Last 30 days';
      break;
    case 'month':
      from = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
      periodLabel = 'This month';
      break;
    case 'quarter': {
      const quarterStartMonth = Math.floor(to.getUTCMonth() / 3) * 3;
      from = new Date(Date.UTC(to.getUTCFullYear(), quarterStartMonth, 1));
      periodLabel = 'This quarter';
      break;
    }
    case 'year':
      from = new Date(Date.UTC(to.getUTCFullYear(), 0, 1));
      periodLabel = 'This year';
      break;
    case '90d':
    default:
      from = new Date(to.getTime() - 90 * 24 * 60 * 60 * 1000);
      periodLabel = 'Last 90 days';
      break;
  }

  const spanMs = Math.max(to.getTime() - from.getTime(), 24 * 60 * 60 * 1000);
  const previousTo = new Date(from.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - spanMs);

  return {
    from,
    to,
    previousFrom,
    previousTo,
    periodLabel,
    period: query.period,
  };
}

export function filterTxns(
  rows: ReportTxnRow[],
  from: Date,
  to: Date,
  userCardId?: string,
): ReportTxnRow[] {
  return rows.filter((row) => {
    if (userCardId && row.userCardId !== userCardId) return false;
    const ts = row.transactedAt.getTime();
    return ts >= from.getTime() && ts <= to.getTime();
  });
}

export function sumVolume(rows: ReportTxnRow[]): number {
  return rows.reduce((sum, row) => sum + row.amountInr, 0);
}

export function buildComparison(
  currentInr: number,
  previousInr: number,
  label: string,
): ReportComparison {
  let changePercent: number | null = null;
  if (previousInr > 0) {
    changePercent = ((currentInr - previousInr) / previousInr) * 100;
  } else if (currentInr > 0) {
    changePercent = 100;
  } else {
    changePercent = 0;
  }

  const direction =
    changePercent == null || Math.abs(changePercent) < 0.5
      ? 'flat'
      : changePercent > 0
        ? 'up'
        : 'down';

  return {
    label,
    currentInr,
    previousInr,
    changePercent,
    direction,
  };
}

function shareRows(
  groups: Map<string, { label: string; sublabel: string | null; valueInr: number; count: number }>,
): ReportBreakdownRow[] {
  const total = [...groups.values()].reduce((sum, row) => sum + row.valueInr, 0);
  return [...groups.entries()]
    .map(([id, row]) => ({
      id,
      label: row.label,
      sublabel: row.sublabel,
      valueInr: row.valueInr,
      sharePercent: total > 0 ? (row.valueInr / total) * 100 : 0,
      count: row.count,
    }))
    .sort((a, b) => b.valueInr - a.valueInr);
}

export function buildCategoryBreakdown(rows: ReportTxnRow[]): ReportBreakdownRow[] {
  const groups = new Map<
    string,
    { label: string; sublabel: string | null; valueInr: number; count: number }
  >();
  for (const row of rows) {
    const slug = row.categorySlug ?? 'other';
    const current = groups.get(slug) ?? {
      label: row.categoryLabel ?? CATEGORY_LABELS[slug] ?? slug,
      sublabel: null,
      valueInr: 0,
      count: 0,
    };
    current.valueInr += row.amountInr;
    current.count += 1;
    groups.set(slug, current);
  }
  return shareRows(groups);
}

export function buildMerchantBreakdown(rows: ReportTxnRow[], limit = 10): ReportBreakdownRow[] {
  const groups = new Map<
    string,
    { label: string; sublabel: string | null; valueInr: number; count: number }
  >();
  for (const row of rows) {
    const key = row.merchantName.toLowerCase();
    const current = groups.get(key) ?? {
      label: row.merchantName,
      sublabel: row.categoryLabel,
      valueInr: 0,
      count: 0,
    };
    current.valueInr += row.amountInr;
    current.count += 1;
    groups.set(key, current);
  }
  return shareRows(groups).slice(0, limit);
}

export function buildIssuerBreakdown(rows: ReportTxnRow[]): ReportBreakdownRow[] {
  const groups = new Map<
    string,
    { label: string; sublabel: string | null; valueInr: number; count: number }
  >();
  for (const row of rows) {
    const key = row.bankName;
    const current = groups.get(key) ?? {
      label: row.bankName,
      sublabel: null,
      valueInr: 0,
      count: 0,
    };
    current.valueInr += row.amountInr;
    current.count += 1;
    groups.set(key, current);
  }
  return shareRows(groups);
}

export function buildSpendingSection(input: {
  type: Extract<
    UserReportType,
    'monthly_spending' | 'category_analysis' | 'merchant_analysis' | 'issuer_comparison'
  >;
  periodLabel: string;
  current: ReportTxnRow[];
  previous: ReportTxnRow[];
}): ReportSection {
  const currentVolume = sumVolume(input.current);
  const previousVolume = sumVolume(input.previous);
  const comparison = buildComparison(currentVolume, previousVolume, 'Spend vs prior period');

  let title = 'Spending report';
  let description = 'Transaction spending for the selected period.';
  let breakdown: ReportBreakdownRow[] = [];

  if (input.type === 'monthly_spending') {
    title = 'Monthly spending';
    description = 'Total spend with month-over-month comparison.';
    breakdown = buildCategoryBreakdown(input.current).slice(0, 6);
  } else if (input.type === 'category_analysis') {
    title = 'Category analysis';
    description = 'Where your spend concentrates by category.';
    breakdown = buildCategoryBreakdown(input.current);
  } else if (input.type === 'merchant_analysis') {
    title = 'Merchant analysis';
    description = 'Top merchants by volume in this period.';
    breakdown = buildMerchantBreakdown(input.current);
  } else {
    title = 'Issuer comparison';
    description = 'Spend volume compared across issuing banks.';
    breakdown = buildIssuerBreakdown(input.current);
  }

  const kpis: ReportKpi[] = [
    {
      id: 'volume',
      label: 'Total spend',
      value: formatReportInr(currentVolume),
      hint: `${input.current.length} transaction${input.current.length === 1 ? '' : 's'}`,
    },
    {
      id: 'avg',
      label: 'Average ticket',
      value:
        input.current.length > 0
          ? formatReportInr(currentVolume / input.current.length)
          : formatReportInr(0),
      hint: null,
    },
    {
      id: 'mom',
      label: 'vs prior period',
      value:
        comparison.changePercent == null
          ? '—'
          : `${comparison.changePercent > 0 ? '+' : ''}${comparison.changePercent.toFixed(1)}%`,
      hint: formatReportInr(previousVolume),
    },
  ];

  const insights: ReportInsight[] = [];
  if (breakdown[0]) {
    insights.push({
      id: 'top-slice',
      title: `Top ${input.type === 'merchant_analysis' ? 'merchant' : input.type === 'issuer_comparison' ? 'issuer' : 'category'}: ${breakdown[0].label}`,
      body: `${breakdown[0].sharePercent.toFixed(1)}% of spend · ${formatReportInr(breakdown[0].valueInr)}.`,
      actionLabel: 'Open spending insights',
      actionPath: '/account/insights/spending',
    });
  }

  return {
    type: input.type,
    title,
    description,
    periodLabel: input.periodLabel,
    kpis,
    breakdown,
    comparison,
    insights,
  };
}

export function buildCashbackSection(input: {
  periodLabel: string;
  totalEarnedInr: number;
  pendingCashbackInr: number;
  monthlyCashbackInr: number;
  categories: Array<{
    categorySlug: string;
    categoryLabel: string;
    totalCashbackInr: number;
    transactionCount: number;
  }>;
}): ReportSection {
  const totalCategories = input.categories.reduce((sum, row) => sum + row.totalCashbackInr, 0);
  const breakdown = input.categories
    .map((row) => ({
      id: row.categorySlug,
      label: row.categoryLabel,
      sublabel: null,
      valueInr: row.totalCashbackInr,
      sharePercent: totalCategories > 0 ? (row.totalCashbackInr / totalCategories) * 100 : 0,
      count: row.transactionCount,
    }))
    .sort((a, b) => b.valueInr - a.valueInr);

  return {
    type: 'cashback_summary',
    title: 'Cashback summary',
    description: 'Earned and pending cashback attributed to your cards.',
    periodLabel: input.periodLabel,
    kpis: [
      {
        id: 'earned',
        label: 'Total earned',
        value: formatReportInr(input.totalEarnedInr),
        hint: null,
      },
      {
        id: 'pending',
        label: 'Pending',
        value: formatReportInr(input.pendingCashbackInr),
        hint: null,
      },
      {
        id: 'monthly',
        label: 'This month',
        value: formatReportInr(input.monthlyCashbackInr),
        hint: null,
      },
    ],
    breakdown,
    comparison: null,
    insights: [
      {
        id: 'cashback-deep',
        title: 'Dig into cashback detail',
        body: 'Open the cashback module for ledger history and forecasts.',
        actionLabel: 'Open cashback',
        actionPath: '/account/cashback',
      },
    ],
  };
}

export function buildRewardSection(input: {
  periodLabel: string;
  totalEstimatedValueInr: number;
  totalAvailablePoints: number;
  totalCashbackInr: number;
  expiringSoonCount: number;
  cards: Array<{
    userCardId: string;
    cardName: string;
    bankName: string;
    totalEstimatedValueInr: number;
  }>;
}): ReportSection {
  const total = input.cards.reduce((sum, card) => sum + card.totalEstimatedValueInr, 0);
  const breakdown = input.cards
    .map((card) => ({
      id: card.userCardId,
      label: card.cardName,
      sublabel: card.bankName,
      valueInr: card.totalEstimatedValueInr,
      sharePercent: total > 0 ? (card.totalEstimatedValueInr / total) * 100 : 0,
      count: null,
    }))
    .sort((a, b) => b.valueInr - a.valueInr);

  const insights: ReportInsight[] = [];
  if (input.expiringSoonCount > 0) {
    insights.push({
      id: 'expiry',
      title: 'Rewards are expiring soon',
      body: `${input.expiringSoonCount} balance${input.expiringSoonCount === 1 ? '' : 's'} need attention.`,
      actionLabel: 'Open reward wallet',
      actionPath: '/account/rewards',
    });
  }

  return {
    type: 'reward_summary',
    title: 'Reward summary',
    description: 'Estimated wallet value across points, miles, and cashback.',
    periodLabel: input.periodLabel,
    kpis: [
      {
        id: 'wallet',
        label: 'Wallet value',
        value: formatReportInr(input.totalEstimatedValueInr),
        hint: null,
      },
      {
        id: 'points',
        label: 'Available points',
        value: Math.round(input.totalAvailablePoints).toLocaleString('en-IN'),
        hint: null,
      },
      {
        id: 'cashback',
        label: 'Cashback balance',
        value: formatReportInr(input.totalCashbackInr),
        hint: null,
      },
    ],
    breakdown,
    comparison: null,
    insights,
  };
}

export function buildFeeAnalysisSection(input: {
  periodLabel: string;
  totalAnnualFeesInr: number;
  portfolioNetRoiInr: number;
  totalWalletValueInr: number;
  cards: Array<{
    userCardId: string;
    cardName: string;
    bankName: string;
    annualFeeInr: number | null;
    netRoiInr: number;
  }>;
}): ReportSection {
  const feeCards = input.cards.filter((card) => (card.annualFeeInr ?? 0) > 0);
  const totalFees = feeCards.reduce((sum, card) => sum + (card.annualFeeInr ?? 0), 0);
  const breakdown = feeCards
    .map((card) => ({
      id: card.userCardId,
      label: card.cardName,
      sublabel: `${card.bankName} · ROI ${formatReportInr(card.netRoiInr)}`,
      valueInr: card.annualFeeInr ?? 0,
      sharePercent: totalFees > 0 ? ((card.annualFeeInr ?? 0) / totalFees) * 100 : 0,
      count: null,
    }))
    .sort((a, b) => b.valueInr - a.valueInr);

  return {
    type: 'fee_analysis',
    title: 'Fee analysis',
    description: 'Annual fees versus estimated reward and benefit value.',
    periodLabel: input.periodLabel,
    kpis: [
      {
        id: 'fees',
        label: 'Annual fees',
        value: formatReportInr(input.totalAnnualFeesInr),
        hint: null,
      },
      {
        id: 'roi',
        label: 'Portfolio net ROI',
        value: formatReportInr(input.portfolioNetRoiInr),
        hint: null,
      },
      {
        id: 'wallet',
        label: 'Wallet value',
        value: formatReportInr(input.totalWalletValueInr),
        hint: null,
      },
    ],
    breakdown,
    comparison: null,
    insights: [
      {
        id: 'premium',
        title: 'Review premium card efficiency',
        body: 'See card-level ROI and fee-waiver progress on the premium dashboard.',
        actionLabel: 'Open premium dashboard',
        actionPath: '/account/premium',
      },
    ],
  };
}

export const AVAILABLE_REPORTS: Array<{
  type: UserReportType;
  title: string;
  description: string;
}> = [
  {
    type: 'monthly_spending',
    title: 'Monthly spending',
    description: 'Spend totals with comparison to the prior period.',
  },
  {
    type: 'category_analysis',
    title: 'Category analysis',
    description: 'Break down spend by category share.',
  },
  {
    type: 'merchant_analysis',
    title: 'Merchant analysis',
    description: 'Top merchants by volume.',
  },
  {
    type: 'issuer_comparison',
    title: 'Issuer comparison',
    description: 'Compare spend across banks.',
  },
  {
    type: 'cashback_summary',
    title: 'Cashback summary',
    description: 'Earned, pending, and category cashback.',
  },
  {
    type: 'reward_summary',
    title: 'Reward summary',
    description: 'Wallet value, points, and expiring balances.',
  },
  {
    type: 'fee_analysis',
    title: 'Fee analysis',
    description: 'Annual fees versus reward ROI.',
  },
];

export function buildReportsHub(input: {
  generatedAt: string;
  periodLabel: string;
  spendCurrent: number;
  spendPrevious: number;
  cashbackEarnedInr: number;
  walletValueInr: number;
  milestoneInProgress: number;
  sections: ReportSection[];
}): UserReportsHub {
  const comparison = buildComparison(
    input.spendCurrent,
    input.spendPrevious,
    'Spend vs prior period',
  );
  const insights: ReportInsight[] = input.sections
    .flatMap((section) => section.insights)
    .slice(0, 5);

  if (input.milestoneInProgress > 0) {
    insights.unshift({
      id: 'milestones',
      title: `${input.milestoneInProgress} milestone${input.milestoneInProgress === 1 ? '' : 's'} in progress`,
      body: 'Track fee-waiver and bonus spend targets while reviewing reports.',
      actionLabel: 'Open milestones',
      actionPath: '/account/milestones',
    });
  }

  return {
    generatedAt: input.generatedAt,
    periodLabel: input.periodLabel,
    availableReports: AVAILABLE_REPORTS,
    kpis: [
      {
        id: 'spend',
        label: 'Spend',
        value: formatReportInr(input.spendCurrent),
        hint: input.periodLabel,
      },
      {
        id: 'cashback',
        label: 'Cashback earned',
        value: formatReportInr(input.cashbackEarnedInr),
        hint: null,
      },
      {
        id: 'wallet',
        label: 'Reward wallet',
        value: formatReportInr(input.walletValueInr),
        hint: null,
      },
      {
        id: 'mom',
        label: 'Spend change',
        value:
          comparison.changePercent == null
            ? '—'
            : `${comparison.changePercent > 0 ? '+' : ''}${comparison.changePercent.toFixed(1)}%`,
        hint: 'vs prior period',
      },
    ],
    comparison,
    sections: input.sections,
    insights: insights.slice(0, 6),
  };
}

export function sectionToCsv(section: ReportSection): string {
  const lines = [
    ['report', 'period', 'kpi', 'value'].join(','),
    ...section.kpis.map((kpi) =>
      [section.type, section.periodLabel, kpi.label, kpi.value].map(csvEscape).join(','),
    ),
    '',
    ['id', 'label', 'sublabel', 'valueInr', 'sharePercent', 'count'].join(','),
    ...section.breakdown.map((row) =>
      [
        row.id,
        row.label,
        row.sublabel ?? '',
        String(Math.round(row.valueInr)),
        row.sharePercent.toFixed(2),
        row.count == null ? '' : String(row.count),
      ]
        .map(csvEscape)
        .join(','),
    ),
  ];
  return lines.join('\n');
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}
