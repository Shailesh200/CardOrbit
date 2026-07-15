import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UpdateDashboardPreferencesSchema } from '@cardwise/validation';

import type { ConsumerPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  @ApiOkResponse({ description: 'Personalized homepage / dashboard snapshot' })
  snapshot(@CurrentUser() user: ConsumerPrincipal) {
    return this.dashboard.getDashboardSnapshot(user.id);
  }

  @Get('preferences')
  @ApiOkResponse({ description: 'Dashboard widget preferences' })
  preferences(@CurrentUser() user: ConsumerPrincipal) {
    return this.dashboard.getDashboardPreferences(user.id);
  }

  @Put('preferences')
  @ApiOkResponse({ description: 'Update dashboard widget preferences' })
  updatePreferences(@CurrentUser() user: ConsumerPrincipal, @Body() body: unknown) {
    const patch = UpdateDashboardPreferencesSchema.parse(body);
    return this.dashboard.updateDashboardPreferences(user.id, patch);
  }
}
