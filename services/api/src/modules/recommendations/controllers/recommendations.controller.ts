import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  parseListRecommendationHistoryQuery,
  parseSubmitRecommendationFeedbackInput,
} from '@cardwise/validation';

import type { ConsumerPrincipal } from '../../auth/auth.types';
import { CurrentUser } from '../../auth/current-user.decorator';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RecommendationHistoryService } from '../recommendation-history.service';
import { RecommendationsService } from '../recommendations.service';
import { toBestCardRecommendationResponse } from './recommendation-api-response';

@ApiTags('recommendations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('recommendations')
export class RecommendationsController {
  constructor(
    private readonly recommendations: RecommendationsService,
    private readonly history: RecommendationHistoryService,
  ) {}

  @Post('best-card')
  @ApiOkResponse({ description: 'Best card recommendation for a transaction' })
  async bestCard(@CurrentUser() user: ConsumerPrincipal, @Body() body: unknown) {
    const result = await this.recommendations.recommendBestCard(user.id, body);
    return toBestCardRecommendationResponse(result);
  }

  @Get('history')
  @ApiOkResponse({ description: 'List recommendation history for the signed-in user' })
  listHistory(@CurrentUser() user: ConsumerPrincipal, @Query('limit') limit?: string) {
    return this.history.listHistory(user.id, parseListRecommendationHistoryQuery({ limit }));
  }

  @Get(':recommendationId')
  @ApiOkResponse({ description: 'Recommendation history detail' })
  getHistory(
    @CurrentUser() user: ConsumerPrincipal,
    @Param('recommendationId') recommendationId: string,
  ) {
    return this.history.getHistoryDetail(user.id, recommendationId);
  }

  @Post(':recommendationId/feedback')
  @ApiOkResponse({ description: 'Submit feedback for a recommendation' })
  submitFeedback(
    @CurrentUser() user: ConsumerPrincipal,
    @Param('recommendationId') recommendationId: string,
    @Body() body: unknown,
  ) {
    return this.history.submitFeedback(
      user.id,
      recommendationId,
      parseSubmitRecommendationFeedbackInput(body),
    );
  }
}
