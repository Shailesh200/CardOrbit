import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import type { ConsumerPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TransactionsService } from './transactions.service';

@ApiTags('transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactions: TransactionsService) {}

  @Get()
  @ApiOkResponse({ description: 'Paginated transaction feed with summary stats' })
  list(@CurrentUser() user: ConsumerPrincipal, @Query() query: unknown) {
    return this.transactions.list(user.id, query);
  }

  @Post('import')
  @ApiOkResponse({ description: 'Import transactions from CSV' })
  importCsv(@CurrentUser() user: ConsumerPrincipal, @Body() body: unknown) {
    return this.transactions.importCsv(user.id, body);
  }

  @Post()
  @ApiOkResponse({ description: 'Create a manual transaction' })
  create(@CurrentUser() user: ConsumerPrincipal, @Body() body: unknown) {
    return this.transactions.create(user.id, body);
  }

  @Get(':transactionId')
  @ApiOkResponse({ description: 'Transaction details' })
  getById(@CurrentUser() user: ConsumerPrincipal, @Param('transactionId') transactionId: string) {
    return this.transactions.getById(user.id, transactionId);
  }

  @Patch(':transactionId')
  @ApiOkResponse({ description: 'Update transaction category, notes, tags, or status' })
  patch(
    @CurrentUser() user: ConsumerPrincipal,
    @Param('transactionId') transactionId: string,
    @Body() body: unknown,
  ) {
    return this.transactions.patch(user.id, transactionId, body);
  }
}
