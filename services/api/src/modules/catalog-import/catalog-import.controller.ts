import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { catalogAiIngestJob, catalogCrawlJob } from '@cardwise/jobs';
import { CatalogImportEntityType, CatalogImportReviewStatus } from '@prisma/client';

import type { AdminPrincipal } from '../admin-auth/admin-auth.types';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { JobsService } from '../jobs/jobs.service';
import { CatalogAiIngestService } from './catalog-ai-ingest.service';
import { CatalogImportService } from './catalog-import.service';

type RequestWithAdmin = { adminUser?: AdminPrincipal };

class ReviewNotesDto {
  notes?: string;
}

@ApiTags('admin-catalog-import')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/catalog-import')
export class CatalogImportController {
  constructor(
    private readonly catalogImport: CatalogImportService,
    private readonly catalogAiIngest: CatalogAiIngestService,
    private readonly jobs: JobsService,
  ) {}

  @Post('ai-ingest/:bankSlug')
  @ApiOkResponse({
    description: 'Enqueue AI catalog ingest job (background worker)',
  })
  aiIngestBank(
    @Param('bankSlug') bankSlug: string,
    @Query('purgePending') purgePending: string | undefined,
    @Query('limit') limit: string | undefined,
    @Req() request: RequestWithAdmin,
  ) {
    return this.jobs.enqueue({
      type: catalogAiIngestJob.type,
      payload: {
        bankSlug,
        purgePending: purgePending !== 'false',
        ...(limit ? { limit: Number(limit) } : {}),
      },
      triggeredBy: request.adminUser?.id,
    });
  }

  @Get('batches/:batchId/ai-ingest-status')
  @ApiOkResponse({ description: 'Legacy batch ingest status (prefer GET /admin/jobs/:id)' })
  aiIngestStatus(@Param('batchId') batchId: string) {
    return this.catalogAiIngest.getAiIngestJobStatus(batchId);
  }

  @Post('crawl/:bankSlug')
  @ApiOkResponse({ description: 'Enqueue rule-based bank crawl job (background worker)' })
  crawlBank(@Param('bankSlug') bankSlug: string, @Req() request: RequestWithAdmin) {
    return this.jobs.enqueue({
      type: catalogCrawlJob.type,
      payload: { bankSlug },
      triggeredBy: request.adminUser?.id,
    });
  }

  @Get('items')
  @ApiOkResponse({ description: 'List catalog import items' })
  listItems(
    @Query('status') status?: CatalogImportReviewStatus,
    @Query('entityType') entityType?: CatalogImportEntityType,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.catalogImport.listItems({
      status,
      entityType,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get('items/:id')
  @ApiOkResponse({ description: 'Get catalog import item' })
  getItem(@Param('id') id: string) {
    return this.catalogImport.getItem(id);
  }

  @Post('items/:id/approve')
  @ApiOkResponse({ description: 'Approve import item for publish' })
  approve(@Param('id') id: string, @Body() body: ReviewNotesDto, @Req() request: RequestWithAdmin) {
    return this.catalogImport.approveItem(id, request.adminUser!, body.notes);
  }

  @Post('items/:id/reject')
  @ApiOkResponse({ description: 'Reject import item' })
  reject(@Param('id') id: string, @Body() body: ReviewNotesDto, @Req() request: RequestWithAdmin) {
    return this.catalogImport.rejectItem(id, request.adminUser!, body.notes);
  }

  @Post('items/:id/publish')
  @ApiOkResponse({ description: 'Publish approved import item to catalog' })
  publish(@Param('id') id: string, @Req() request: RequestWithAdmin) {
    return this.catalogImport.publishItem(id, request.adminUser!);
  }

  @Get('stats')
  @ApiOkResponse({ description: 'Import queue and live catalog counts' })
  stats() {
    return this.catalogImport.getStats();
  }

  @Post('approve-all-pending')
  @ApiOkResponse({ description: 'Approve all pending import items (optional entity type filter)' })
  approveAll(
    @Query('entityType') entityType: CatalogImportEntityType | undefined,
    @Req() request: RequestWithAdmin,
  ) {
    return this.catalogImport.approveAllPending(request.adminUser!, entityType);
  }

  @Post('publish-all-approved')
  @ApiOkResponse({ description: 'Publish all approved import items to live catalog' })
  publishAll(
    @Query('entityType') entityType: CatalogImportEntityType | undefined,
    @Req() request: RequestWithAdmin,
  ) {
    return this.catalogImport.publishAllApproved(request.adminUser!, entityType);
  }

  @Post('batches/:batchId/publish-approved')
  @ApiOkResponse({ description: 'Publish all approved items in a batch' })
  publishBatch(@Param('batchId') batchId: string, @Req() request: RequestWithAdmin) {
    return this.catalogImport.publishApprovedBatch(request.adminUser!, batchId);
  }
}
