import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { parseUpdateFeatureFlagInput } from '@cardwise/validation';

import type { AdminPrincipal } from '../admin-auth/admin-auth.types';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { FeatureFlagsService } from './feature-flags.service';

type RequestWithAdmin = { adminUser?: AdminPrincipal };

@ApiTags('admin-features')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/features')
export class AdminFeatureFlagsController {
  constructor(private readonly featureFlags: FeatureFlagsService) {}

  @Get()
  @ApiOkResponse({ description: 'All feature flag definitions' })
  listDefinitions() {
    return this.featureFlags.listDefinitions();
  }

  @Patch(':key')
  @ApiOkResponse({ description: 'Update rollout settings for a feature flag' })
  updateDefinition(
    @Param('key') key: string,
    @Body() body: unknown,
    @Req() request: RequestWithAdmin,
  ) {
    const input = parseUpdateFeatureFlagInput(body);
    return this.featureFlags.updateDefinition(key, input, request.adminUser?.id);
  }
}
