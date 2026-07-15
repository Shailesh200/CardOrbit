import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import type { ConsumerPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TripPlannerService } from './trip-planner.service';

@ApiTags('trip-planner')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('trip-planner')
export class TripPlannerController {
  constructor(private readonly tripPlanner: TripPlannerService) {}

  @Get()
  @ApiOkResponse({ description: 'Trip planner page viewed telemetry' })
  viewed(@CurrentUser() user: ConsumerPrincipal) {
    this.tripPlanner.trackPlannerViewed(user.id);
    return { ok: true };
  }

  @Post('plan')
  @ApiOkResponse({ description: 'Card-aware trip plan with category recommendations' })
  plan(@CurrentUser() user: ConsumerPrincipal, @Body() body: unknown) {
    return this.tripPlanner.createPlan(user.id, body);
  }
}
