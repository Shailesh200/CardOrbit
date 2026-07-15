import { Inject, Injectable } from '@nestjs/common';

import type { RewardRuleVersionEntity } from '../../domain/entities/reward-rule';
import {
  REWARD_RULE_REPOSITORY,
  type RewardRuleRepository,
} from '../../domain/repositories/reward-rule.repository';

@Injectable()
export class ActivateRewardRuleVersionCommand {
  constructor(@Inject(REWARD_RULE_REPOSITORY) private readonly rewardRules: RewardRuleRepository) {}

  execute(versionId: string): Promise<RewardRuleVersionEntity> {
    return this.rewardRules.activateVersion(versionId);
  }
}
