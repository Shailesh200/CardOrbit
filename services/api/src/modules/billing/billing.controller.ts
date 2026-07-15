import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import type { ConsumerPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BillingService } from './billing.service';

@ApiTags('statements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('statements')
export class StatementsController {
  constructor(private readonly billing: BillingService) {}

  @Get()
  @ApiOkResponse({ description: 'Paginated statement history' })
  list(@CurrentUser() user: ConsumerPrincipal, @Query() query: unknown) {
    return this.billing.listStatements(user.id, query);
  }

  @Post()
  @ApiOkResponse({ description: 'Create a manual statement record' })
  create(@CurrentUser() user: ConsumerPrincipal, @Body() body: unknown) {
    return this.billing.createStatement(user.id, body);
  }

  @Get(':statementId')
  @ApiOkResponse({ description: 'Statement details with period spend' })
  getById(@CurrentUser() user: ConsumerPrincipal, @Param('statementId') statementId: string) {
    return this.billing.getStatement(user.id, statementId);
  }

  @Patch(':statementId')
  @ApiOkResponse({ description: 'Update statement amounts or status' })
  patch(
    @CurrentUser() user: ConsumerPrincipal,
    @Param('statementId') statementId: string,
    @Body() body: unknown,
  ) {
    return this.billing.patchStatement(user.id, statementId, body);
  }
}

@ApiTags('bills')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bills')
export class BillsController {
  constructor(private readonly billing: BillingService) {}

  @Get()
  @ApiOkResponse({ description: 'Outstanding and upcoming bills across portfolio cards' })
  list(@CurrentUser() user: ConsumerPrincipal, @Query() query: unknown) {
    return this.billing.listBills(user.id, query);
  }

  @Get(':billId/payments')
  @ApiOkResponse({ description: 'Payment history for a bill' })
  listPayments(@CurrentUser() user: ConsumerPrincipal, @Param('billId') billId: string) {
    return this.billing.listBillPayments(user.id, billId);
  }

  @Post(':billId/payments')
  @ApiOkResponse({ description: 'Record a bill payment' })
  recordPayment(
    @CurrentUser() user: ConsumerPrincipal,
    @Param('billId') billId: string,
    @Body() body: unknown,
  ) {
    return this.billing.recordPayment(user.id, billId, body);
  }

  @Get(':billId/autopay')
  @ApiOkResponse({ description: 'Auto-pay visibility (not configured in M-041)' })
  getAutopay(@CurrentUser() user: ConsumerPrincipal, @Param('billId') billId: string) {
    return this.billing.getAutopayStatus(user.id, billId);
  }

  @Get(':billId')
  @ApiOkResponse({ description: 'Bill detail including payment history' })
  getById(@CurrentUser() user: ConsumerPrincipal, @Param('billId') billId: string) {
    return this.billing.getBill(user.id, billId);
  }
}

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('billing')
export class BillingCalendarController {
  constructor(private readonly billing: BillingService) {}

  @Get('calendar')
  @ApiOkResponse({ description: 'Monthly billing calendar with due dates and statement days' })
  getCalendar(@CurrentUser() user: ConsumerPrincipal, @Query() query: unknown) {
    return this.billing.getCalendar(user.id, query);
  }
}
