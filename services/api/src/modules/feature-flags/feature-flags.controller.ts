import { Controller, Get, Headers, Req, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import type { ConsumerPrincipal } from '../auth/auth.types';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { FeatureFlagsService } from './feature-flags.service';

type RequestWithOptionalUser = {
  user?: ConsumerPrincipal;
};

@ApiTags('features')
@Controller('features')
export class FeatureFlagsController {
  constructor(private readonly featureFlags: FeatureFlagsService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOkResponse({ description: 'Evaluated feature flags for the current user or anonymous id' })
  getSnapshot(
    @Req() request: RequestWithOptionalUser,
    @Headers('x-cardwise-distinct-id') distinctIdHeader?: string,
  ) {
    const distinctId = request.user?.id ?? (distinctIdHeader?.trim() || 'anonymous');
    return this.featureFlags.getEvaluatedSnapshot(distinctId);
  }
}
