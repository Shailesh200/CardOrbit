import { Inject, Injectable } from '@nestjs/common';

import type { ActiveRewardRuleView } from '../../domain/entities/reward-rule';
import {
  REWARD_RULE_REPOSITORY,
  type RewardRuleRepository,
} from '../../domain/repositories/reward-rule.repository';

@Injectable()
export class ListRewardRulesQuery {
  constructor(@Inject(REWARD_RULE_REPOSITORY) private readonly rewardRules: RewardRuleRepository) {}

  execute(): Promise<ActiveRewardRuleView[]> {
    return this.rewardRules.listActive();
  }
}
