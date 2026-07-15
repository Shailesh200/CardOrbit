import { Controller, Delete, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiAcceptedResponse, ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { ConsumerPrincipal } from '../auth/auth.types';
import { PrivacyService } from './privacy.service';

@ApiTags('privacy')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users/me')
export class PrivacyController {
  constructor(private readonly privacyService: PrivacyService) {}

  @Post('export')
  @HttpCode(202)
  @ApiAcceptedResponse({ description: 'Data export request accepted (stub)' })
  exportData(@CurrentUser() user: ConsumerPrincipal) {
    return this.privacyService.requestExport(user.id);
  }

  @Delete()
  @HttpCode(202)
  @ApiAcceptedResponse({ description: 'Account deletion scheduled (stub)' })
  deleteAccount(@CurrentUser() user: ConsumerPrincipal) {
    return this.privacyService.requestDeletion(user.id);
  }
}
