import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import type { ConsumerPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MilestonesService } from './milestones.service';

@ApiTags('milestones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('milestones')
export class MilestonesController {
  constructor(private readonly milestones: MilestonesService) {}

  @Get()
  @ApiOkResponse({ description: 'Spend milestone progress across portfolio cards' })
  list(@CurrentUser() user: ConsumerPrincipal) {
    return this.milestones.getSpendMilestones(user.id);
  }

  @Get('annual-fee-waiver')
  @ApiOkResponse({ description: 'Annual fee waiver progress by card' })
  annualFeeWaiver(@CurrentUser() user: ConsumerPrincipal) {
    return this.milestones.getAnnualFeeWaiver(user.id);
  }

  @Get('forecast')
  @ApiOkResponse({ description: 'Estimated milestone completion dates' })
  forecast(@CurrentUser() user: ConsumerPrincipal) {
    return this.milestones.getForecast(user.id);
  }
}
