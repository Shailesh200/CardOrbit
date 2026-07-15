import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import type { ConsumerPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PremiumDashboardService } from './premium-dashboard.service';

@ApiTags('premium-dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('premium-dashboard')
export class PremiumDashboardController {
  constructor(private readonly premiumDashboard: PremiumDashboardService) {}

  @Get()
  @ApiOkResponse({ description: 'Premium card ROI dashboard with recommendations' })
  overview(@CurrentUser() user: ConsumerPrincipal) {
    return this.premiumDashboard.getOverview(user.id);
  }
}
