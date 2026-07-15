import type {
  ActiveRewardRuleView,
  CreateRewardRuleInput,
  CreateRewardRuleVersionInput,
  RewardRuleEntity,
  RewardRuleVersionEntity,
} from '../entities/reward-rule';

export const REWARD_RULE_REPOSITORY = Symbol('REWARD_RULE_REPOSITORY');

export interface RewardRuleRepository {
  createRule(input: CreateRewardRuleInput): Promise<RewardRuleEntity>;
  createVersion(input: CreateRewardRuleVersionInput): Promise<RewardRuleVersionEntity>;
  findRuleByKey(
    ruleKey: string,
    options?: { includeDeleted?: boolean },
  ): Promise<RewardRuleEntity | null>;
  listActive(): Promise<ActiveRewardRuleView[]>;
  listActiveForCard(creditCardId: string): Promise<ActiveRewardRuleView[]>;
  listVersionHistory(ruleKey: string): Promise<RewardRuleVersionEntity[]>;
  activateVersion(versionId: string): Promise<RewardRuleVersionEntity>;
  deactivateVersion(versionId: string): Promise<RewardRuleVersionEntity>;
}
