import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { AdminInsightsService } from './admin-insights.service';

@ApiTags('admin-insights')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/insights')
export class AdminInsightsController {
  constructor(private readonly insights: AdminInsightsService) {}

  @Get('overview')
  @ApiOkResponse({ description: 'Insights dashboard metrics' })
  overview() {
    return this.insights.getOverview();
  }

  @Get('catalog-stats')
  @ApiOkResponse({ description: 'Catalog import stats for SDUI' })
  catalogStats() {
    return this.insights.getCatalogStats();
  }

  @Get('rule-templates')
  @ApiOkResponse({ description: 'Predefined rule templates' })
  ruleTemplates() {
    return this.insights.getRuleTemplates();
  }
}
