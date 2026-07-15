import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import type { ConsumerPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OnboardingService, type PatchOnboardingInput } from './onboarding.service';

class PatchOnboardingDto {
  action!: 'complete_step' | 'skip_step' | 'back';
  answers?: unknown;
}

@ApiTags('onboarding')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Get()
  @ApiOkResponse({ description: 'Current onboarding state' })
  get(@CurrentUser() user: ConsumerPrincipal) {
    return this.onboarding.getState(user.id);
  }

  @Patch()
  @ApiOkResponse({ description: 'Advance or rewind onboarding step' })
  patch(@CurrentUser() user: ConsumerPrincipal, @Body() body: PatchOnboardingDto) {
    return this.onboarding.patch(user.id, body as PatchOnboardingInput);
  }

  @Post('complete')
  @ApiOkResponse({ description: 'Mark onboarding completed' })
  complete(@CurrentUser() user: ConsumerPrincipal) {
    return this.onboarding.complete(user.id);
  }

  @Post('skip')
  @ApiOkResponse({ description: 'Skip entire onboarding flow' })
  skip(@CurrentUser() user: ConsumerPrincipal) {
    return this.onboarding.skipAll(user.id);
  }
}
