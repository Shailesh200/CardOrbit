import type { RewardRulePayload } from '@cardwise/validation';

export type RewardRuleEntity = {
  id: string;
  ruleKey: string;
  name: string;
  creditCardId: string;
  rewardProgramId: string | null;
  version: number;
  deletedAt: Date | null;
};

export type RewardRuleVersionEntity = {
  id: string;
  ruleId: string;
  versionNumber: number;
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
  spendCategoryId: string | null;
  merchantId: string | null;
  payload: RewardRulePayload;
  validFrom: Date | null;
  validUntil: Date | null;
  activatedAt: Date | null;
  deactivatedAt: Date | null;
  version: number;
  deletedAt: Date | null;
};

export type ActiveRewardRuleView = {
  rule: RewardRuleEntity;
  activeVersion: RewardRuleVersionEntity;
  pointValueInr: number | null;
  spendCategoryCode: string | null;
};

export type CreateRewardRuleInput = {
  ruleKey: string;
  name: string;
  creditCardId: string;
  rewardProgramId?: string | null;
};

export type CreateRewardRuleVersionInput = {
  ruleId: string;
  versionNumber: number;
  spendCategoryId?: string | null;
  merchantId?: string | null;
  payload: unknown;
  validFrom?: Date | null;
  validUntil?: Date | null;
  status?: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
};
