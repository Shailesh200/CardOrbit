import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { parseRagAnswerRequest, parseRagRetrievalRequest } from '@cardwise/validation';

import type { ConsumerPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ContextEngineService } from './context-engine.service';
import { RagService } from './rag.service';

class RagRetrievalDto {
  q!: string;
  types?: Array<'card' | 'merchant'>;
  limit?: number;
}

@ApiTags('ai-rag')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class RagController {
  constructor(
    private readonly contextEngine: ContextEngineService,
    private readonly rag: RagService,
  ) {}

  @Get('context')
  @ApiOkResponse({ description: 'Read-only user context for RAG / assistant (no PII)' })
  getContext(@CurrentUser() user: ConsumerPrincipal) {
    return this.contextEngine.buildUserContext(user.id);
  }

  @Post('rag/retrieve')
  @ApiOkResponse({ description: 'Retrieve grounded catalog chunks for a question' })
  retrieve(@CurrentUser() user: ConsumerPrincipal, @Body() body: RagRetrievalDto) {
    return this.rag.retrieve(user.id, parseRagRetrievalRequest(body));
  }

  @Post('rag/answer')
  @ApiOkResponse({ description: 'Retrieve context and generate a grounded read-only answer' })
  answer(@CurrentUser() user: ConsumerPrincipal, @Body() body: RagRetrievalDto) {
    return this.rag.answer(user.id, parseRagAnswerRequest(body));
  }
}
