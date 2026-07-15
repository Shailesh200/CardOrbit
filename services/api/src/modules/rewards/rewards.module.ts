import { Module } from '@nestjs/common';

import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { AuthModule } from '../auth/auth.module';
import { MerchantsModule } from '../merchants/merchants.module';
import { ActivateRewardRuleVersionCommand } from './application/commands/activate-rule-version.command';
import {
  CreateRewardRuleCommand,
  CreateRewardRuleVersionCommand,
} from './application/commands/create-reward-rule.command';
import { DeactivateRewardRuleVersionCommand } from './application/commands/deactivate-rule-version.command';
import {
  CalculateRewardQuery,
  PreviewRewardRuleQuery,
} from './application/queries/calculate-reward.query';
import { ListRewardRulesQuery } from './application/queries/list-reward-rules.query';
import { AdminRewardsController } from './controllers/admin-rewards.controller';
import { RewardsController } from './controllers/rewards.controller';
import { REWARD_RULE_EVALUATOR } from './domain/ports/reward-rule-evaluator.port';
import { REWARD_RULE_REPOSITORY } from './domain/repositories/reward-rule.repository';
import { PrismaRewardRuleRepository } from './infrastructure/prisma-reward-rule.repository';
import { RewardRuleEvaluatorService } from './infrastructure/reward-rule-evaluator.service';

@Module({
  imports: [AdminAuthModule, AuthModule, MerchantsModule],
  controllers: [AdminRewardsController, RewardsController],
  providers: [
    { provide: REWARD_RULE_REPOSITORY, useClass: PrismaRewardRuleRepository },
    { provide: REWARD_RULE_EVALUATOR, useClass: RewardRuleEvaluatorService },
    PrismaRewardRuleRepository,
    RewardRuleEvaluatorService,
    ListRewardRulesQuery,
    CalculateRewardQuery,
    PreviewRewardRuleQuery,
    CreateRewardRuleCommand,
    CreateRewardRuleVersionCommand,
    ActivateRewardRuleVersionCommand,
    DeactivateRewardRuleVersionCommand,
  ],
  exports: [
    REWARD_RULE_REPOSITORY,
    REWARD_RULE_EVALUATOR,
    ActivateRewardRuleVersionCommand,
    DeactivateRewardRuleVersionCommand,
    CalculateRewardQuery,
  ],
})
export class RewardsModule {
  static readonly EVALUATOR = REWARD_RULE_EVALUATOR;
}
