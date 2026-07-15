import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import type { ConsumerPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CardBenefitsService } from './card-benefits.service';

@ApiTags('card-benefits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user-cards')
export class CardBenefitsController {
  constructor(private readonly cardBenefits: CardBenefitsService) {}

  @Get(':userCardId/benefits-dashboard')
  @ApiOkResponse({ description: 'Full card benefits dashboard for a portfolio card' })
  getDashboard(@CurrentUser() user: ConsumerPrincipal, @Param('userCardId') userCardId: string) {
    return this.cardBenefits.getDashboard(user.id, userCardId);
  }
}
