import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import type { ConsumerPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CashbackService } from './cashback.service';

@ApiTags('cashback')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cashback')
export class CashbackController {
  constructor(private readonly cashback: CashbackService) {}

  @Get()
  @ApiOkResponse({ description: 'Cashback dashboard totals across portfolio cards' })
  dashboard(@CurrentUser() user: ConsumerPrincipal) {
    return this.cashback.getDashboard(user.id);
  }

  @Get('history')
  @ApiOkResponse({ description: 'Paginated cashback earning history' })
  history(@CurrentUser() user: ConsumerPrincipal, @Query() query: unknown) {
    return this.cashback.getHistory(user.id, query);
  }

  @Get('categories')
  @ApiOkResponse({ description: 'Cashback grouped by spending category' })
  categories(@CurrentUser() user: ConsumerPrincipal) {
    return this.cashback.getCategories(user.id);
  }

  @Get('forecast')
  @ApiOkResponse({ description: 'Projected monthly cashback from recent spend rate' })
  forecast(@CurrentUser() user: ConsumerPrincipal) {
    return this.cashback.getForecast(user.id);
  }

  @Get('transactions/:transactionId')
  @ApiOkResponse({ description: 'Cashback attribution for a single transaction' })
  transactionAttribution(
    @CurrentUser() user: ConsumerPrincipal,
    @Param('transactionId') transactionId: string,
  ) {
    return this.cashback.getTransactionAttribution(user.id, transactionId);
  }
}
