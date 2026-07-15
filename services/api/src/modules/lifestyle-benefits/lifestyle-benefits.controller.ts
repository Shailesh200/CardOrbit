import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import type { ConsumerPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LifestyleBenefitsService } from './lifestyle-benefits.service';

@ApiTags('lifestyle-benefits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('lifestyle-benefits')
export class LifestyleBenefitsController {
  constructor(private readonly lifestyleBenefits: LifestyleBenefitsService) {}

  @Get()
  @ApiOkResponse({ description: 'Portfolio lifestyle benefits overview' })
  overview(@CurrentUser() user: ConsumerPrincipal) {
    return this.lifestyleBenefits.getOverview(user.id);
  }

  @Get('insurance')
  @ApiOkResponse({ description: 'Insurance benefits by card' })
  insurance(@CurrentUser() user: ConsumerPrincipal) {
    return this.lifestyleBenefits.getInsurance(user.id);
  }

  @Get('fuel')
  @ApiOkResponse({ description: 'Fuel benefits by card' })
  fuel(@CurrentUser() user: ConsumerPrincipal) {
    return this.lifestyleBenefits.getFuel(user.id);
  }

  @Get('dining')
  @ApiOkResponse({ description: 'Dining benefits by card' })
  dining(@CurrentUser() user: ConsumerPrincipal) {
    return this.lifestyleBenefits.getDining(user.id);
  }

  @Get('emi')
  @ApiOkResponse({ description: 'EMI benefits by card' })
  emi(@CurrentUser() user: ConsumerPrincipal) {
    return this.lifestyleBenefits.getEmi(user.id);
  }
}
