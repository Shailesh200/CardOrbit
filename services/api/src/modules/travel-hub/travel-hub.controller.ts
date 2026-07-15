import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import type { ConsumerPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TravelHubService } from './travel-hub.service';

@ApiTags('travel-hub')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('travel-hub')
export class TravelHubController {
  constructor(private readonly travelHub: TravelHubService) {}

  @Get()
  @ApiOkResponse({ description: 'Travel hub overview across portfolio cards' })
  overview(@CurrentUser() user: ConsumerPrincipal) {
    return this.travelHub.getOverview(user.id);
  }

  @Get('lounge')
  @ApiOkResponse({ description: 'Lounge access benefits by card' })
  lounge(@CurrentUser() user: ConsumerPrincipal) {
    return this.travelHub.getLoungeOverview(user.id);
  }

  @Get('miles')
  @ApiOkResponse({ description: 'Airline miles and hotel points overview' })
  miles(@CurrentUser() user: ConsumerPrincipal) {
    return this.travelHub.getMilesOverview(user.id);
  }

  @Get('spending')
  @ApiOkResponse({ description: 'Travel category spending summary' })
  spending(@CurrentUser() user: ConsumerPrincipal) {
    return this.travelHub.getTravelSpending(user.id);
  }
}
