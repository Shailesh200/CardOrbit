import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { AdminJwtGuard } from '../../admin-auth/admin-jwt.guard';
import { RecommendationsService } from '../recommendations.service';
import { toBestCardRecommendationResponse } from './recommendation-api-response';

@ApiTags('admin-recommendations')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/recommendations')
export class AdminRecommendationsController {
  constructor(private readonly recommendations: RecommendationsService) {}

  @Post('audit')
  @ApiOkResponse({ description: 'Audit recommendation evaluation for a user portfolio' })
  async audit(@Body() body: unknown) {
    const result = await this.recommendations.auditRecommendation(body);

    return {
      userId: result.userId,
      audit: result.audit,
      ...toBestCardRecommendationResponse(result),
    };
  }
}
