import type {
  CardBenefitItem,
  CardRewardRuleSummary,
  ComparisonColumn,
  ComparisonRow,
} from '@cardwise/validation';

export type CardComparisonSnapshot = {
  userCardId: string;
  creditCardId: string;
  cardName: string;
  nickname: string | null;
  bankName: string;
  bankSlug: string;
  cardSlug: string;
  tier: string;
  isFavorite: boolean;
  annualFeeInr: number | null;
  joiningFeeInr: number | null;
  maxRewardMultiplier: number | null;
  maxCashbackPercent: number | null;
  pointValueInr: number | null;
  loungeSummary: string;
  insuranceSummary: string;
  fuelSummary: string;
  travelSummary: string;
  welcomeSummary: string;
  forexMarkupSummary: string | null;
  milestoneCount: number;
  offerCount: number;
  benefitCount: number;
  walletValueInr: number | null;
};

type MetricDef = {
  id: string;
  group: ComparisonRow['group'];
  label: string;
  getValue: (card: CardComparisonSnapshot) => string;
  getNumeric?: (card: CardComparisonSnapshot) => number | null;
  highlight?: 'lowest' | 'highest' | 'most';
};

const METRICS: MetricDef[] = [
  {
    id: 'annual-fee',
    group: 'fees',
    label: 'Annual fee',
    getValue: (c) => formatInrOrDash(c.annualFeeInr),
    getNumeric: (c) => c.annualFeeInr,
    highlight: 'lowest',
  },
  {
    id: 'joining-fee',
    group: 'fees',
    label: 'Joining fee',
    getValue: (c) => formatInrOrDash(c.joiningFeeInr),
    getNumeric: (c) => c.joiningFeeInr,
    highlight: 'lowest',
  },
  {
    id: 'reward-rate',
    group: 'rewards',
    label: 'Best reward rate',
    getValue: (c) => {
      if (c.maxCashbackPercent != null) return `${c.maxCashbackPercent}% cashback`;
      if (c.maxRewardMultiplier != null) return `${c.maxRewardMultiplier}x points`;
      return '—';
    },
    getNumeric: (c) => c.maxCashbackPercent ?? c.maxRewardMultiplier,
    highlight: 'highest',
  },
  {
    id: 'point-value',
    group: 'rewards',
    label: 'Point value (INR)',
    getValue: (c) => (c.pointValueInr != null ? `₹${c.pointValueInr}` : '—'),
    getNumeric: (c) => c.pointValueInr,
    highlight: 'highest',
  },
  {
    id: 'wallet-value',
    group: 'rewards',
    label: 'Wallet value tracked',
    getValue: (c) => formatInrOrDash(c.walletValueInr),
    getNumeric: (c) => c.walletValueInr,
    highlight: 'highest',
  },
  {
    id: 'lounge',
    group: 'lifestyle',
    label: 'Lounge access',
    getValue: (c) => c.loungeSummary,
  },
  {
    id: 'insurance',
    group: 'lifestyle',
    label: 'Insurance',
    getValue: (c) => c.insuranceSummary,
  },
  {
    id: 'forex',
    group: 'fees',
    label: 'Forex markup',
    getValue: (c) => c.forexMarkupSummary ?? '—',
  },
  {
    id: 'fuel',
    group: 'benefits',
    label: 'Fuel benefits',
    getValue: (c) => c.fuelSummary,
  },
  {
    id: 'travel',
    group: 'benefits',
    label: 'Travel benefits',
    getValue: (c) => c.travelSummary,
  },
  {
    id: 'welcome',
    group: 'benefits',
    label: 'Welcome bonus',
    getValue: (c) => c.welcomeSummary,
  },
  {
    id: 'milestones',
    group: 'rewards',
    label: 'Spend milestones',
    getValue: (c) => (c.milestoneCount > 0 ? String(c.milestoneCount) : '—'),
    getNumeric: (c) => (c.milestoneCount > 0 ? c.milestoneCount : null),
    highlight: 'most',
  },
  {
    id: 'offers',
    group: 'benefits',
    label: 'Active offers',
    getValue: (c) => (c.offerCount > 0 ? String(c.offerCount) : '—'),
    getNumeric: (c) => (c.offerCount > 0 ? c.offerCount : null),
    highlight: 'most',
  },
  {
    id: 'benefit-count',
    group: 'benefits',
    label: 'Total benefits',
    getValue: (c) => String(c.benefitCount),
    getNumeric: (c) => c.benefitCount,
    highlight: 'most',
  },
];

export function buildComparisonRows(cards: CardComparisonSnapshot[]): ComparisonRow[] {
  return METRICS.map((metric) => {
    const values: Record<string, string> = {};
    for (const card of cards) {
      values[card.userCardId] = metric.getValue(card);
    }

    const uniqueValues = new Set(Object.values(values));
    const isDifferent = uniqueValues.size > 1;

    let bestUserCardId: string | null = null;
    if (metric.highlight && metric.getNumeric) {
      bestUserCardId = pickBestUserCardId(cards, metric.getNumeric, metric.highlight);
    }

    return {
      id: metric.id,
      group: metric.group,
      label: metric.label,
      values,
      bestUserCardId,
      highlight: metric.highlight ?? null,
      isDifferent,
    };
  });
}

export function buildComparisonColumns(cards: CardComparisonSnapshot[]): ComparisonColumn[] {
  return cards.map((card) => ({
    userCardId: card.userCardId,
    creditCardId: card.creditCardId,
    cardName: card.cardName,
    nickname: card.nickname,
    bankName: card.bankName,
    bankSlug: card.bankSlug,
    cardSlug: card.cardSlug,
    tier: card.tier,
    isFavorite: card.isFavorite,
  }));
}

export function pickRecommendedCard(cards: CardComparisonSnapshot[]): string | null {
  if (cards.length === 0) return null;

  let bestId = cards[0]!.userCardId;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const card of cards) {
    let score = 0;
    if (card.maxCashbackPercent != null) score += card.maxCashbackPercent * 10;
    if (card.maxRewardMultiplier != null) score += card.maxRewardMultiplier * 5;
    if (card.pointValueInr != null) score += card.pointValueInr * 100;
    if (card.walletValueInr != null) score += card.walletValueInr / 1000;
    if (card.benefitCount > 0) score += card.benefitCount;
    if (card.annualFeeInr != null) score -= card.annualFeeInr / 500;
    if (card.isFavorite) score += 2;

    if (score > bestScore) {
      bestScore = score;
      bestId = card.userCardId;
    }
  }

  return bestId;
}

export function summarizeBenefits(items: CardBenefitItem[], fallback = '—'): string {
  if (items.length === 0) return fallback;
  if (items.length === 1) return items[0]!.title;
  return `${items[0]!.title} +${items.length - 1} more`;
}

export function extractForexMarkup(feeBenefits: CardBenefitItem[]): string | null {
  for (const item of feeBenefits) {
    const text = `${item.title} ${item.description ?? ''}`.toLowerCase();
    const match = text.match(/(\d+(?:\.\d+)?)\s*%/);
    if (text.includes('forex') || text.includes('markup')) {
      return match ? `${match[1]}%` : item.title;
    }
  }
  return null;
}

export function maxFromRules(
  rules: CardRewardRuleSummary[],
  field: 'rewardMultiplier' | 'cashbackPercent',
): number | null {
  const values = rules.map((rule) => rule[field]).filter((value): value is number => value != null);
  return values.length > 0 ? Math.max(...values) : null;
}

function pickBestUserCardId(
  cards: CardComparisonSnapshot[],
  getNumeric: (card: CardComparisonSnapshot) => number | null,
  mode: 'lowest' | 'highest' | 'most',
): string | null {
  const scored = cards
    .map((card) => ({ userCardId: card.userCardId, value: getNumeric(card) }))
    .filter((entry): entry is { userCardId: string; value: number } => entry.value != null);

  if (scored.length === 0) return null;

  scored.sort((a, b) => (mode === 'lowest' ? a.value - b.value : b.value - a.value));
  const bestValue = scored[0]!.value;
  const tied = scored.filter((entry) => entry.value === bestValue);
  return tied.length === 1 ? tied[0]!.userCardId : null;
}

function formatInrOrDash(value: number | null): string {
  if (value == null) return '—';
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}
