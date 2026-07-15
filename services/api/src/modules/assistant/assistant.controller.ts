import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  parseAssistantChatRequest,
  parseAssistantConfirmProposalInput,
} from '@cardwise/validation';

import type { ConsumerPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AssistantService } from './assistant.service';

class AssistantChatDto {
  message!: string;
  conversationId?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

@ApiTags('ai-assistant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  @Get('assistant/status')
  @ApiOkResponse({ description: 'AI assistant / Financial Copilot availability' })
  status(@CurrentUser() user: ConsumerPrincipal) {
    return this.assistant.getStatus(user.id);
  }

  @Get('assistant/conversation')
  @ApiOkResponse({ description: 'Latest assistant conversation for the current user' })
  conversation(@CurrentUser() user: ConsumerPrincipal) {
    return this.assistant.getConversation(user.id);
  }

  @Post('chat')
  @ApiOkResponse({ description: 'Conversational assistant / Financial Copilot turn' })
  chat(@CurrentUser() user: ConsumerPrincipal, @Body() body: AssistantChatDto) {
    return this.assistant.chat(user.id, parseAssistantChatRequest(body));
  }

  @Post('copilot/confirm')
  @ApiOkResponse({ description: 'Confirm or cancel a Financial Copilot proposal' })
  confirmProposal(@CurrentUser() user: ConsumerPrincipal, @Body() body: unknown) {
    return this.assistant.confirmProposal(user.id, parseAssistantConfirmProposalInput(body));
  }
}
