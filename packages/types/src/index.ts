/**
 * Shared TypeScript types for CardWise.
 */

export type Placeholder = Record<string, never>;

/** Card catalog types — populated by M-006 schema; seed data in M-010 */

export type BankSummary = {
  id: string;
  name: string;
  slug: string;
  country: string;
  logoUrl?: string | null;
};

export type CardNetworkSummary = {
  id: string;
  code: string;
  name: string;
  slug: string;
};

export type CreditCardSummary = {
  id: string;
  name: string;
  slug: string;
  bankId: string;
  networkId: string;
  rewardProgramId?: string | null;
  tier: string;
  active: boolean;
  annualFeeInr?: string | null;
  joiningFeeInr?: string | null;
};

/** Merchant catalog types — populated by M-007 schema; seed data in M-010 */

export type MerchantCategorySummary = {
  id: string;
  code: string;
  name: string;
  slug: string;
  description?: string | null;
};

export type MerchantSummary = {
  id: string;
  name: string;
  slug: string;
  primaryCategoryId?: string | null;
  paymentMethods: unknown;
  active: boolean;
};

export type MerchantAliasSummary = {
  id: string;
  merchantId: string;
  alias: string;
  normalizedAlias: string;
};

export type MccMappingSummary = {
  id: string;
  mccCode: string;
  categoryId: string;
  merchantId?: string | null;
  description?: string | null;
};

/** Reward rules types — populated by M-008 schema; seed data in M-010 */

export type RewardRuleSummary = {
  id: string;
  ruleKey: string;
  name: string;
  creditCardId: string;
  rewardProgramId?: string | null;
};

export type RewardRuleVersionSummary = {
  id: string;
  ruleId: string;
  versionNumber: number;
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
  spendCategoryId?: string | null;
  merchantId?: string | null;
  payload: unknown;
  validFrom?: string | null;
  validUntil?: string | null;
};

/** Offer catalog types — populated by M-009 schema; seed data in M-010 */

export type OfferSummary = {
  id: string;
  code: string;
  slug: string;
  title: string;
  type: 'MERCHANT' | 'BANK' | 'CARD';
  status: 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'HISTORICAL';
  issuerBankId?: string | null;
  cashbackPercent?: string | null;
  capInr?: string | null;
  validFrom: string;
  validUntil?: string | null;
};

export type OfferCardAssignmentSummary = {
  id: string;
  offerId: string;
  creditCardId: string;
};

export type OfferMerchantSummary = {
  id: string;
  offerId: string;
  merchantId: string;
};
