import { Controller, Get, Headers, Req, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import type { ConsumerPrincipal } from '../auth/auth.types';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { ExperimentsService } from './experiments.service';

type RequestWithOptionalUser = {
  user?: ConsumerPrincipal;
};

@ApiTags('experiments')
@Controller('experiments')
export class ExperimentsController {
  constructor(private readonly experiments: ExperimentsService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOkResponse({ description: 'Evaluated experiment variant assignments for the current user' })
  getSnapshot(
    @Req() request: RequestWithOptionalUser,
    @Headers('x-cardwise-distinct-id') distinctIdHeader?: string,
  ) {
    const distinctId = request.user?.id ?? (distinctIdHeader?.trim() || 'anonymous');
    return this.experiments.getAssignmentsSnapshot(distinctId);
  }
}
