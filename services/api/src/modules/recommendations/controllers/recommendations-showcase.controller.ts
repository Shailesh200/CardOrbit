import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { RecommendationsService } from '../recommendations.service';
import { toBestCardRecommendationResponse } from './recommendation-api-response';

@ApiTags('recommendations')
@Controller('recommendations')
export class RecommendationsShowcaseController {
  constructor(private readonly recommendations: RecommendationsService) {}

  @Get('showcase')
  @ApiOkResponse({ description: 'Public live recommendation for the home hero' })
  async showcase() {
    const result = await this.recommendations.recommendShowcase();
    return {
      source: result.source,
      ...toBestCardRecommendationResponse(result),
    };
  }
}
