import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  GraphEntityTypeSchema,
  parseGraphExpandRequest,
  parseGraphTraverseRequest,
} from '@cardwise/validation';

import type { ConsumerPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { KnowledgeGraphService } from './knowledge-graph.service';

class GraphTraverseDto {
  entityType!: string;
  slug!: string;
  depth?: number;
  limit?: number;
}

class GraphExpandDto {
  entities!: Array<{ entityType: 'card' | 'merchant'; id: string }>;
  limit?: number;
}

@ApiTags('ai-knowledge-graph')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai/graph')
export class KnowledgeGraphController {
  constructor(private readonly graph: KnowledgeGraphService) {}

  @Get('entity/:entityType/:slug')
  @ApiOkResponse({ description: 'Resolve a catalog entity into a graph node' })
  async getEntity(
    @CurrentUser() user: ConsumerPrincipal,
    @Param('entityType') entityType: string,
    @Param('slug') slug: string,
  ) {
    const parsedType = GraphEntityTypeSchema.parse(entityType);
    const node = await this.graph.getEntity(user.id, parsedType, slug);
    return { node };
  }

  @Post('traverse')
  @ApiOkResponse({ description: 'Traverse catalog relationships from a starting entity' })
  traverse(@CurrentUser() user: ConsumerPrincipal, @Body() body: GraphTraverseDto) {
    return this.graph.traverse(user.id, parseGraphTraverseRequest(body));
  }

  @Post('expand')
  @ApiOkResponse({ description: 'Expand graph neighbors for retrieval entities' })
  expand(@CurrentUser() user: ConsumerPrincipal, @Body() body: GraphExpandDto) {
    return this.graph.expand(user.id, parseGraphExpandRequest(body));
  }
}
