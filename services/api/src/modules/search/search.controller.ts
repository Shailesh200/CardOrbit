import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import type { ConsumerPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SemanticSearchService } from './semantic-search.service';

@ApiTags('search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly search: SemanticSearchService) {}

  @Get('ai/status')
  @ApiOkResponse({ description: 'Semantic search readiness and index stats' })
  aiStatus(@CurrentUser() user: ConsumerPrincipal) {
    return this.search.getStatus(user.id);
  }

  @Get('ai')
  @ApiOkResponse({ description: 'Natural-language search over cards and merchants' })
  aiSearch(
    @CurrentUser() user: ConsumerPrincipal,
    @Query('q') q?: string,
    @Query('types') types?: string,
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
  ) {
    return this.search.search(user.id, {
      q,
      types,
      offset: offset ? Number(offset) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
