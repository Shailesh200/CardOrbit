import {
  SPENDING_CATEGORY_LABELS,
  type SpendingCategoryBreakdown,
  type SpendingInsightItem,
  type SpendingMerchantSummary,
} from '@cardwise/validation';

export type HistoryRow = {
  amountInr: number;
  categorySlug: string | null;
  merchantSlug: string | null;
  merchantName: string | null;
};

export type ProfileWeights = {
  categorySlugs: string[];
  estimatedMonthlySpendInr: number | null;
};

const HISTORY_LOOKBACK_DAYS = 90;

export function categoryLabel(slug: string): string {
  return SPENDING_CATEGORY_LABELS[slug] ?? slug.replaceAll('_', ' ');
}

export function buildCategoryBreakdownFromHistory(rows: HistoryRow[]): SpendingCategoryBreakdown[] {
  const totals = new Map<string, { volumeInr: number; count: number }>();

  for (const row of rows) {
    const slug = normalizeCategorySlug(row.categorySlug);
    const current = totals.get(slug) ?? { volumeInr: 0, count: 0 };
    current.volumeInr += row.amountInr;
    current.count += 1;
    totals.set(slug, current);
  }

  return toBreakdown(totals);
}

export function buildCategoryBreakdownFromProfile(
  weights: ProfileWeights,
): SpendingCategoryBreakdown[] {
  const slugs =
    weights.categorySlugs.length > 0 ? weights.categorySlugs : ['dining', 'online', 'travel'];
  const monthly = weights.estimatedMonthlySpendInr ?? 25000;
  const share = 100 / slugs.length;

  return slugs.map((slug) => ({
    slug,
    label: categoryLabel(slug),
    sharePercent: Math.round(share * 10) / 10,
    volumeInr: Math.round((monthly * share) / 100),
    inquiryCount: 0,
  }));
}

export function blendCategoryBreakdowns(
  history: SpendingCategoryBreakdown[],
  profile: SpendingCategoryBreakdown[],
): SpendingCategoryBreakdown[] {
  if (history.length === 0) return profile;
  if (profile.length === 0) return history;

  const merged = new Map<string, { volumeInr: number; count: number }>();

  for (const row of history) {
    merged.set(row.slug, {
      volumeInr: row.volumeInr * 0.7,
      count: row.inquiryCount,
    });
  }

  for (const row of profile) {
    const current = merged.get(row.slug) ?? { volumeInr: 0, count: 0 };
    current.volumeInr += row.volumeInr * 0.3;
    merged.set(row.slug, current);
  }

  return toBreakdown(merged);
}

export function buildTopMerchants(rows: HistoryRow[], limit = 5): SpendingMerchantSummary[] {
  const totals = new Map<string, SpendingMerchantSummary>();

  for (const row of rows) {
    const key = row.merchantSlug ?? row.merchantName ?? 'unknown';
    const name =
      row.merchantName?.trim() && !/^unknown merchant$/i.test(row.merchantName.trim())
        ? row.merchantName.trim()
        : 'Unknown merchant';
    const current = totals.get(key) ?? {
      name,
      slug: row.merchantSlug,
      volumeInr: 0,
      inquiryCount: 0,
    };
    // Prefer a real name if a later row has one for the same key
    if (current.name === 'Unknown merchant' && name !== 'Unknown merchant') {
      current.name = name;
    }
    current.volumeInr += row.amountInr;
    current.inquiryCount += 1;
    totals.set(key, current);
  }

  return [...totals.values()].sort((a, b) => b.volumeInr - a.volumeInr).slice(0, limit);
}

export function buildSpendingInsights(input: {
  categories: SpendingCategoryBreakdown[];
  topMerchants: SpendingMerchantSummary[];
  inquiryCount: number;
  totalVolumeInr: number;
  dataSource: 'recommendation_history' | 'onboarding_profile' | 'blended' | 'transactions';
  opportunity?: { cardName: string; categoryLabel: string; estimatedAnnualInr: number } | null;
}): SpendingInsightItem[] {
  const insights: SpendingInsightItem[] = [];
  const top = input.categories[0];

  if (top && top.sharePercent > 0) {
    const bodyBySource =
      input.dataSource === 'transactions'
        ? `${top.label} accounts for ${top.sharePercent}% of your imported spend (₹${Math.round(top.volumeInr).toLocaleString('en-IN')} across ${top.inquiryCount || 0} transactions).`
        : input.dataSource === 'onboarding_profile'
          ? `${top.label} is one of your priority categories from onboarding — about ${top.sharePercent}% of estimated monthly spend.`
          : `${top.label} accounts for ${top.sharePercent}% of your recent reward lookups (₹${Math.round(top.volumeInr).toLocaleString('en-IN')} across ${top.inquiryCount || 'estimated'} inquiries).`;

    insights.push({
      id: 'top-category',
      title: `${top.label} leads your spend profile`,
      body: bodyBySource,
      actionLabel: input.dataSource === 'transactions' ? 'View transactions' : 'Search a merchant',
      actionPath:
        input.dataSource === 'transactions' ? '/account/transactions' : '/account/merchants',
    });
  }

  if (input.topMerchants[0]) {
    const merchant = input.topMerchants[0];
    insights.push({
      id: 'top-merchant',
      title: `Most checked: ${merchant.name}`,
      body: `You've explored rewards for ₹${Math.round(merchant.volumeInr).toLocaleString('en-IN')} at ${merchant.name} recently.`,
      actionLabel: merchant.slug ? 'Open merchant' : null,
      actionPath: merchant.slug ? `/account/merchants/${merchant.slug}` : null,
    });
  }

  if (input.opportunity && input.opportunity.estimatedAnnualInr > 0) {
    insights.push({
      id: 'optimization',
      title: 'Reward optimization opportunity',
      body: `Routing more ${input.opportunity.categoryLabel.toLowerCase()} spend through ${input.opportunity.cardName} could earn approximately ₹${Math.round(input.opportunity.estimatedAnnualInr).toLocaleString('en-IN')} more annually.`,
      actionLabel: 'View portfolio',
      actionPath: '/account/cards',
    });
  }

  if (input.inquiryCount === 0) {
    insights.push({
      id: 'get-started',
      title: 'Build your spending picture',
      body: 'Search merchants and get recommendations — CardOrbit learns your category mix from every lookup until transaction import arrives in a later milestone.',
      actionLabel: 'Find a merchant',
      actionPath: '/account/merchants',
    });
  }

  return insights.slice(0, 4);
}

export function estimateMonthlySpendFromBand(spendBand: string | undefined | null): number | null {
  switch (spendBand) {
    case 'UNDER_10K':
      return 7500;
    case '10K_50K':
      return 30000;
    case '50K_PLUS':
      return 75000;
    default:
      return null;
  }
}

export function historySinceDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() - HISTORY_LOOKBACK_DAYS);
  return date;
}

export type CardCategoryRate = {
  cardName: string;
  ratePercent: number;
};

export function computeOptimizationOpportunity(input: {
  categorySlug: string;
  monthlyCategorySpendInr: number;
  cards: CardCategoryRate[];
  baselineRatePercent?: number;
}): { cardName: string; categoryLabel: string; estimatedAnnualInr: number } | null {
  if (input.cards.length === 0 || input.monthlyCategorySpendInr <= 0) return null;

  const sorted = [...input.cards].sort((a, b) => b.ratePercent - a.ratePercent);
  const best = sorted[0]!;
  const baseline = input.baselineRatePercent ?? 1;
  const comparisonRate = sorted[1]?.ratePercent ?? baseline;
  const upliftRate = best.ratePercent - Math.max(baseline, comparisonRate);

  if (upliftRate <= 0.5) return null;

  const estimatedAnnualInr = input.monthlyCategorySpendInr * 12 * (upliftRate / 100);
  return {
    cardName: best.cardName,
    categoryLabel: categoryLabel(input.categorySlug),
    estimatedAnnualInr: Math.round(estimatedAnnualInr),
  };
}

function normalizeCategorySlug(slug: string | null | undefined): string {
  if (!slug?.trim()) return 'other';
  return slug.trim().toLowerCase();
}

function toBreakdown(
  totals: Map<string, { volumeInr: number; count: number }>,
): SpendingCategoryBreakdown[] {
  const totalVolume = [...totals.values()].reduce((sum, row) => sum + row.volumeInr, 0);

  return [...totals.entries()]
    .map(([slug, row]) => ({
      slug,
      label: categoryLabel(slug),
      sharePercent: totalVolume > 0 ? Math.round((row.volumeInr / totalVolume) * 1000) / 10 : 0,
      volumeInr: Math.round(row.volumeInr * 100) / 100,
      inquiryCount: row.count,
    }))
    .sort((a, b) => b.volumeInr - a.volumeInr);
}
