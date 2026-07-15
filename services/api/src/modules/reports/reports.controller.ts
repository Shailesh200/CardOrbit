import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import type { ConsumerPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  @ApiOkResponse({ description: 'User reports & analytics hub' })
  getHub(
    @CurrentUser() user: ConsumerPrincipal,
    @Query('period') period?: string,
    @Query('userCardId') userCardId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reports.getHub(user.id, { period, userCardId, from, to });
  }

  @Get(':type/export')
  @ApiOkResponse({ description: 'Export a typed report as CSV' })
  exportReport(
    @CurrentUser() user: ConsumerPrincipal,
    @Param('type') type: string,
    @Query('period') period?: string,
    @Query('userCardId') userCardId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reports.exportReport(user.id, type, { period, userCardId, from, to });
  }

  @Get(':type')
  @ApiOkResponse({ description: 'Typed financial report section' })
  getReport(
    @CurrentUser() user: ConsumerPrincipal,
    @Param('type') type: string,
    @Query('period') period?: string,
    @Query('userCardId') userCardId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reports.getReport(user.id, type, { period, userCardId, from, to });
  }
}
