import { Body, Controller, Get, Param, Post, Query, Req, Sse, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';

import type { AdminPrincipal } from '../admin-auth/admin-auth.types';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { JobsService } from './jobs.service';

type RequestWithAdmin = { adminUser?: AdminPrincipal };

class EnqueueJobDto {
  type!: string;
  payload!: Record<string, unknown>;
}

@ApiTags('admin-jobs')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Get('types')
  @ApiOkResponse({ description: 'Registered background job types' })
  listTypes() {
    return this.jobs.listTypes();
  }

  @Get()
  @ApiOkResponse({ description: 'Paginated job run history' })
  list(
    @Query('type') type?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('active') active?: string,
  ) {
    return this.jobs.listJobs({
      type,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      active: active === '1' || active === 'true',
    });
  }

  @Post()
  @ApiOkResponse({ description: 'Enqueue a background job' })
  enqueue(@Body() body: EnqueueJobDto, @Req() request: RequestWithAdmin) {
    return this.jobs.enqueue({
      type: body.type,
      payload: body.payload,
      triggeredBy: request.adminUser?.id,
    });
  }

  @Sse(':id/events')
  @ApiOkResponse({ description: 'SSE stream for job progress (pub/sub)' })
  events(@Param('id') id: string): Observable<MessageEvent> {
    return this.jobs.streamJobEvents(id);
  }

  @Post('cancel/:id')
  @ApiOkResponse({ description: 'Cancel a queued or running background job' })
  cancel(@Param('id') id: string) {
    return this.jobs.cancelJob(id);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Job run status' })
  get(@Param('id') id: string) {
    return this.jobs.getJob(id);
  }
}
