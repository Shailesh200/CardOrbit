import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import type { ConsumerPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CardComparisonService } from './card-comparison.service';

@ApiTags('card-comparison')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('card-comparison')
export class CardComparisonController {
  constructor(private readonly cardComparison: CardComparisonService) {}

  @Post()
  @ApiOkResponse({ description: 'Side-by-side comparison for 2–4 portfolio cards' })
  compare(@CurrentUser() user: ConsumerPrincipal, @Body() body: unknown) {
    return this.cardComparison.compare(user.id, body);
  }
}
