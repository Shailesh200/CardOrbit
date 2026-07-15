import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import type { ConsumerPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RedemptionsService } from './redemptions.service';

@ApiTags('redemptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('redemptions')
export class RedemptionsController {
  constructor(private readonly redemptions: RedemptionsService) {}

  @Get()
  @ApiOkResponse({ description: 'Redemption catalog with value comparison across portfolio cards' })
  catalog(@CurrentUser() user: ConsumerPrincipal) {
    return this.redemptions.getCatalog(user.id);
  }

  @Get('recommendations')
  @ApiOkResponse({ description: 'Ranked redemption recommendations by effective value' })
  recommendations(@CurrentUser() user: ConsumerPrincipal) {
    return this.redemptions.getRecommendations(user.id);
  }

  @Get('history')
  @ApiOkResponse({ description: 'Paginated redemption history' })
  history(@CurrentUser() user: ConsumerPrincipal, @Query() query: unknown) {
    return this.redemptions.getHistory(user.id, query);
  }

  @Post('validate')
  @ApiOkResponse({ description: 'Validate redemption eligibility and estimated value' })
  validate(@CurrentUser() user: ConsumerPrincipal, @Body() body: unknown) {
    return this.redemptions.validate(user.id, body);
  }

  @Post()
  @ApiOkResponse({ description: 'Record a completed redemption and adjust wallet balance' })
  record(@CurrentUser() user: ConsumerPrincipal, @Body() body: unknown) {
    return this.redemptions.record(user.id, body);
  }

  @Get(':redemptionId')
  @ApiOkResponse({ description: 'Redemption record detail' })
  detail(@CurrentUser() user: ConsumerPrincipal, @Param('redemptionId') redemptionId: string) {
    return this.redemptions.getById(user.id, redemptionId);
  }
}
