import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AiRunStatus } from '@prisma/client';
import {
  parseCreateAiPromptVersionInput,
  parseUpdateAiPromptVersionInput,
} from '@cardwise/validation';

import type { AdminPrincipal } from '../admin-auth/admin-auth.types';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { AiService } from './ai.service';

type RequestWithAdmin = { adminUser?: AdminPrincipal };

@ApiTags('admin-ai')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get('status')
  @ApiOkResponse({ description: 'AI platform configuration and feature flags' })
  getStatus() {
    return this.ai.getPlatformStatus();
  }

  @Get('routing')
  @ApiOkResponse({ description: 'Effective model routing per AI task' })
  getRouting() {
    return this.ai.getTaskRouting();
  }

  @Post('ping')
  @ApiOkResponse({ description: 'Verify Gemini connectivity and log an AiRun' })
  ping(@Req() request: RequestWithAdmin) {
    return this.ai.ping(request.adminUser?.id);
  }

  @Get('runs/summary')
  @ApiOkResponse({ description: 'Aggregated AI run metrics for dashboard' })
  getRunSummary(@Query('days') days?: string) {
    return this.ai.getRunSummary({ days: days ? Number(days) : undefined });
  }

  @Get('runs')
  @ApiOkResponse({ description: 'List AI run audit logs' })
  listRuns(
    @Query('feature') feature?: string,
    @Query('status') status?: AiRunStatus,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.ai.listRuns({
      feature,
      status,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get('runs/:id')
  @ApiOkResponse({ description: 'Get a single AI run' })
  getRun(@Param('id') id: string) {
    return this.ai.getRun(id);
  }

  @Get('prompts')
  @ApiOkResponse({ description: 'List prompt versions' })
  listPrompts(@Query('feature') feature?: string) {
    return this.ai.listPromptVersions(feature);
  }

  @Get('prompts/:id')
  @ApiOkResponse({ description: 'Get a prompt version' })
  getPrompt(@Param('id') id: string) {
    return this.ai.getPromptVersion(id);
  }

  @Post('prompts')
  @ApiOkResponse({ description: 'Create a new prompt version' })
  createPrompt(@Body() body: unknown, @Req() request: RequestWithAdmin) {
    const input = parseCreateAiPromptVersionInput(body);
    return this.ai.createPromptVersion(input, request.adminUser?.id);
  }

  @Patch('prompts/:id')
  @ApiOkResponse({ description: 'Update a prompt version' })
  updatePrompt(@Param('id') id: string, @Body() body: unknown, @Req() request: RequestWithAdmin) {
    const input = parseUpdateAiPromptVersionInput(body);
    return this.ai.updatePromptVersion(id, input, request.adminUser?.id);
  }

  @Post('prompts/:id/activate')
  @ApiOkResponse({ description: 'Activate a prompt version for its feature' })
  activatePrompt(@Param('id') id: string, @Req() request: RequestWithAdmin) {
    return this.ai.activatePromptVersion(id, request.adminUser?.id);
  }
}
