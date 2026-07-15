import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { parseUpsertRewardWalletInput } from '@cardwise/validation';

import type { ConsumerPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RewardWalletService } from './reward-wallet.service';

@ApiTags('reward-wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reward-wallet')
export class RewardWalletController {
  constructor(private readonly rewardWallet: RewardWalletService) {}

  @Get()
  @ApiOkResponse({ description: 'Consolidated reward wallet overview' })
  getOverview(@CurrentUser() user: ConsumerPrincipal) {
    return this.rewardWallet.getOverview(user.id);
  }

  @Get('cards/:userCardId')
  @ApiOkResponse({ description: 'Reward wallet for a portfolio card' })
  getCardWallet(@CurrentUser() user: ConsumerPrincipal, @Param('userCardId') userCardId: string) {
    return this.rewardWallet.getCardWallet(user.id, userCardId);
  }

  @Put('cards/:userCardId')
  @ApiOkResponse({ description: 'Update manual reward balances for a portfolio card' })
  upsertCardWallet(
    @CurrentUser() user: ConsumerPrincipal,
    @Param('userCardId') userCardId: string,
    @Body() body: unknown,
  ) {
    const input = parseUpsertRewardWalletInput(body);
    return this.rewardWallet.upsertCardWallet(user.id, userCardId, input);
  }
}
