import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import type { ConsumerPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RewardExpiryService } from './reward-expiry.service';

@ApiTags('reward-expiry')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reward-expiry')
export class RewardExpiryController {
  constructor(private readonly rewardExpiry: RewardExpiryService) {}

  @Get()
  @ApiOkResponse({
    description: 'Reward expiry intelligence — expiring soon, redeem-first, strategy',
  })
  getIntelligence(@CurrentUser() user: ConsumerPrincipal) {
    return this.rewardExpiry.getIntelligence(user.id);
  }
}
