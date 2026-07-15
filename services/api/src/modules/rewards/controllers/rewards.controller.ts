import { Body, Controller, NotFoundException, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/current-user.decorator';
import type { ConsumerPrincipal } from '../../auth/auth.types';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CalculateRewardQuery } from '../application/queries/calculate-reward.query';

@ApiTags('rewards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rewards')
export class RewardsController {
  constructor(private readonly calculateReward: CalculateRewardQuery) {}

  @Post('calculate')
  @ApiOkResponse({ description: 'Calculate expected rewards for a transaction' })
  async calculate(@CurrentUser() _user: ConsumerPrincipal, @Body() body: unknown) {
    const result = await this.calculateReward.execute(body);
    if (!result) {
      throw new NotFoundException('No applicable reward rule found for this transaction');
    }

    return {
      ruleKey: result.ruleKey,
      ruleName: result.ruleName,
      rewardPoints: result.rewardPoints,
      cashValue: result.estimatedValueInr,
      cashbackInr: result.cashbackInr,
      multiplier: result.multiplier ?? null,
      cashbackPercent: result.cashbackPercent ?? null,
      effectiveRatePercent: result.effectiveRatePercent,
      benefitsApplied: result.benefitsApplied,
      explanation: result.explanation,
      excluded: result.excluded,
      capped: result.capped,
    };
  }
}
