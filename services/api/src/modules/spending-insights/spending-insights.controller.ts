import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import type { ConsumerPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SpendingInsightsService } from './spending-insights.service';

@ApiTags('spending-insights')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('spending-insights')
export class SpendingInsightsController {
  constructor(private readonly spendingInsights: SpendingInsightsService) {}

  @Get()
  @ApiOkResponse({ description: 'Category breakdown and spending insights for the signed-in user' })
  getOverview(@CurrentUser() user: ConsumerPrincipal) {
    return this.spendingInsights.getOverview(user.id);
  }
}
