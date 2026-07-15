import { Inject, Injectable } from '@nestjs/common';

import type {
  CreateRewardRuleInput,
  CreateRewardRuleVersionInput,
  RewardRuleEntity,
  RewardRuleVersionEntity,
} from '../../domain/entities/reward-rule';
import {
  REWARD_RULE_REPOSITORY,
  type RewardRuleRepository,
} from '../../domain/repositories/reward-rule.repository';

@Injectable()
export class CreateRewardRuleCommand {
  constructor(@Inject(REWARD_RULE_REPOSITORY) private readonly rewardRules: RewardRuleRepository) {}

  execute(input: CreateRewardRuleInput): Promise<RewardRuleEntity> {
    return this.rewardRules.createRule(input);
  }
}

@Injectable()
export class CreateRewardRuleVersionCommand {
  constructor(@Inject(REWARD_RULE_REPOSITORY) private readonly rewardRules: RewardRuleRepository) {}

  execute(input: CreateRewardRuleVersionInput): Promise<RewardRuleVersionEntity> {
    return this.rewardRules.createVersion(input);
  }
}
