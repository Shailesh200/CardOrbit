import { authFetch } from '@cardwise/auth';

const API_BASE = import.meta.env.VITE_API_URL || '';

export type CardBenefitItem = {
  id: string;
  title: string;
  description: string | null;
  sectionCode: string;
  sectionLabel: string;
  sourceUrl: string | null;
};

export type CardBenefitSection = {
  code: string;
  label: string;
  items: CardBenefitItem[];
};

export type CardRewardRuleSummary = {
  id: string;
  ruleKey: string;
  name: string;
  spendCategoryCode: string | null;
  rewardMultiplier: number | null;
  cashbackPercent: number | null;
  milestoneBonus: number | null;
  spendThreshold: number | null;
  capSummary: string | null;
};

export type CardMilestonePreview = {
  id: string;
  label: string;
  spendThreshold: number | null;
  milestoneBonus: number | null;
  sourceRuleName: string;
};

export type CardOfferSummary = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cashbackPercent: number | null;
  validUntil: string | null;
  status: string;
};

export type CardAnnualFeeSummary = {
  annualFeeInr: number | null;
  joiningFeeInr: number | null;
  fees: Array<{
    id: string;
    feeType: string;
    amountInr: number | null;
    waiverConditions: string | null;
  }>;
  feeBenefits: CardBenefitItem[];
};

export type CardWalletSnapshot = {
  totalEstimatedValueInr: number;
  expiringSoonCount: number;
  lastSyncedAt: string | null;
};

export type CardRecommendationHistoryItem = {
  id: string;
  merchantName: string | null;
  amountInr: number;
  expectedRewardInr: number | null;
  createdAt: string;
  wasRecommended: boolean;
};

export type CardBenefitsOverview = {
  userCardId: string;
  creditCardId: string;
  cardName: string;
  nickname: string | null;
  bankName: string;
  bankSlug: string;
  cardSlug: string;
  networkName: string;
  tier: string;
  status: string;
  isFavorite: boolean;
  sourceUrl: string | null;
  statementDay: number | null;
  dueDay: number | null;
  rewardProgramName: string | null;
  pointValueInr: number | null;
  benefitCount: number;
  wallet: CardWalletSnapshot | null;
};

export type CardBenefitsDashboard = {
  overview: CardBenefitsOverview;
  benefitSections: CardBenefitSection[];
  rewardRules: CardRewardRuleSummary[];
  milestones: CardMilestonePreview[];
  offers: CardOfferSummary[];
  loungeAccess: CardBenefitItem[];
  insurance: CardBenefitItem[];
  annualFee: CardAnnualFeeSummary;
  recommendationHistory: CardRecommendationHistoryItem[];
};

export function getCardBenefitsDashboard(userCardId: string) {
  return authFetch<CardBenefitsDashboard>(
    `${API_BASE}/api/v1/user-cards/${encodeURIComponent(userCardId)}/benefits-dashboard`,
  );
}

export function formatInr(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatRuleRate(rule: CardRewardRuleSummary): string {
  if (rule.cashbackPercent != null) return `${rule.cashbackPercent}% cashback`;
  if (rule.rewardMultiplier != null) return `${rule.rewardMultiplier}x points`;
  if (rule.milestoneBonus != null) return `Bonus ${rule.milestoneBonus}`;
  return 'Reward rule';
}
