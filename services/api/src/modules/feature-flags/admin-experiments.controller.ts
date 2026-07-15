import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { parseUpdateExperimentInput } from '@cardwise/validation';

import type { AdminPrincipal } from '../admin-auth/admin-auth.types';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { ExperimentsService } from './experiments.service';

type RequestWithAdmin = { adminUser?: AdminPrincipal };

@ApiTags('admin-experiments')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/experiments')
export class AdminExperimentsController {
  constructor(private readonly experiments: ExperimentsService) {}

  @Get()
  @ApiOkResponse({ description: 'All experiment definitions' })
  listDefinitions() {
    return this.experiments.listDefinitions();
  }

  @Patch(':key')
  @ApiOkResponse({ description: 'Update rollout settings for an experiment' })
  updateDefinition(
    @Param('key') key: string,
    @Body() body: unknown,
    @Req() request: RequestWithAdmin,
  ) {
    const input = parseUpdateExperimentInput(body);
    return this.experiments.updateDefinition(key, input, request.adminUser?.id);
  }
}
