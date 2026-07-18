import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { classifyAssistantIntent, generateAssistantTurn, isAiConfigured } from '@cardwise/ai';
import { FeatureFlag } from '@cardwise/feature-flags';
import type {
  AssistantAction,
  AssistantChatMessage,
  AssistantChatRequest,
  AssistantChatResponse,
  AssistantConfirmProposalResult,
  AssistantConversation,
  AssistantIntentOutput,
  AssistantMessageMetadata,
  AssistantProposal,
  AssistantResultItem,
  AssistantStatus,
  AssistantToolName,
  RagCitation,
  UserAiContext,
} from '@cardwise/validation';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { newUuidV7 } from '../../infrastructure/prisma/uuid';
import { AiService } from '../ai/ai.service';
import { FinancialCalendarService } from '../financial-calendar/financial-calendar.service';
import { MilestonesService } from '../milestones/milestones.service';
import { RecommendationsService } from '../recommendations/recommendations.service';
import { ContextEngineService } from '../rag/context-engine.service';
import { RagService } from '../rag/rag.service';
import { RewardWalletService } from '../reward-wallet/reward-wallet.service';
import { UserCardsService } from '../user-cards/user-cards.service';
import {
  buildReminderProposal,
  buildWeeklyOptimizationSummary,
  looksLikeCalendarAgenda,
  looksLikeConfirmMessage,
  looksLikeReminderRequest,
  looksLikeWeeklyOptimize,
  parseReminderHints,
} from './copilot.builder';

const MAX_STORED_MESSAGES = 50;
const MAX_HISTORY_TURNS = 12;

@Injectable()
export class AssistantService {
  constructor(
    private readonly ai: AiService,
    private readonly contextEngine: ContextEngineService,
    private readonly rag: RagService,
    private readonly recommendations: RecommendationsService,
    private readonly portfolio: UserCardsService,
    private readonly rewardWallet: RewardWalletService,
    private readonly milestones: MilestonesService,
    private readonly calendar: FinancialCalendarService,
    private readonly prisma: PrismaService,
  ) {}

  async getStatus(userId: string): Promise<AssistantStatus> {
    const [assistantEnabled, copilotEnabled] = await Promise.all([
      this.ai.isFeatureEnabled(FeatureFlag.AI_ASSISTANT_ENABLED, userId),
      this.ai.isFeatureEnabled(FeatureFlag.AI_COPILOT_ENABLED, userId),
    ]);
    const enabled = assistantEnabled || copilotEnabled;
    return {
      enabled,
      configured: isAiConfigured(),
      mode: !enabled ? 'off' : copilotEnabled ? 'copilot' : 'assistant',
      copilotEnabled,
    };
  }

  private async assertChatEnabled(userId: string): Promise<{ copilot: boolean }> {
    const status = await this.getStatus(userId);
    if (!status.enabled) {
      throw new BadRequestException(
        'AI chat is disabled (enable ai_assistant_enabled or ai_copilot_enabled)',
      );
    }
    return { copilot: status.mode === 'copilot' };
  }

  async getConversation(userId: string): Promise<AssistantConversation | null> {
    await this.assertChatEnabled(userId);

    const conversation = await this.prisma.assistantConversation.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: MAX_STORED_MESSAGES,
        },
      },
    });

    if (!conversation) return null;

    return {
      conversationId: conversation.id,
      messages: conversation.messages.map((message) =>
        this.mapStoredMessage(message.role, message.content, message.metadata),
      ),
    };
  }

  private mapStoredMessage(
    role: string,
    content: string,
    metadata: unknown,
  ): AssistantConversation['messages'][number] {
    if (role !== 'assistant') {
      return { role: 'user', content };
    }

    const meta =
      metadata && typeof metadata === 'object' ? (metadata as AssistantMessageMetadata) : undefined;

    return {
      role: 'assistant',
      content,
      ...(meta?.confidence ? { confidence: meta.confidence } : {}),
      ...(meta?.toolsUsed ? { toolsUsed: meta.toolsUsed } : {}),
      ...(meta?.citations ? { citations: meta.citations } : {}),
      ...(meta?.results ? { results: meta.results } : {}),
      ...(meta?.proposals ? { proposals: meta.proposals } : {}),
    };
  }

  async chat(userId: string, request: AssistantChatRequest): Promise<AssistantChatResponse> {
    const { copilot } = await this.assertChatEnabled(userId);

    const conversationId = await this.resolveConversationId(userId, request.conversationId);
    const history = await this.loadConversationHistory(userId, conversationId, request.history);
    const userContext = await this.contextEngine.buildUserContext(userId);

    if (copilot && looksLikeConfirmMessage(request.message)) {
      const pending = await this.findLatestPendingProposal(userId, conversationId);
      if (pending) {
        const confirmed = await this.confirmProposal(userId, {
          conversationId,
          proposalId: pending.id,
          confirmed: true,
        });
        const response: AssistantChatResponse = {
          conversationId,
          message: confirmed.detail,
          readOnly: true,
          mode: 'copilot',
          confidence: confirmed.ok ? 'high' : 'medium',
          toolsUsed: [],
          citations: [],
          actions: confirmed.ok ? [{ type: 'OPEN_CALENDAR', label: 'Open calendar' }] : [],
          results: [],
          proposals: [],
        };
        await this.persistTurn(userId, conversationId, request.message, response);
        return response;
      }
    }

    const toolsUsed: AssistantToolName[] = [];
    const toolResults: Record<string, unknown> = {};
    const citations: RagCitation[] = [];
    const actions: AssistantAction[] = [];
    const proposals: AssistantProposal[] = [];

    const intentResult = isAiConfigured()
      ? await this.classifyIntentSafely(request.message, history, userContext, copilot)
      : null;

    const intent: AssistantIntentOutput = this.resolveIntent(
      request.message,
      intentResult ?? this.fallbackIntent(request.message, copilot),
      copilot,
    );

    switch (intent.intent) {
      case 'recommendation':
        await this.runRecommendationTool(
          userId,
          {
            merchantSlug: intent.merchantSlug,
            merchantName: intent.merchantName,
            categorySlug: intent.categorySlug,
            amount: intent.amount,
          },
          toolsUsed,
          toolResults,
          actions,
        );
        break;
      case 'list_cards':
        await this.runListCardsTool(userId, userContext, toolsUsed, toolResults, actions);
        break;
      case 'weekly_optimize':
        if (copilot) {
          await this.runWeeklyOptimizeTool(userId, userContext, toolsUsed, toolResults, actions);
        } else {
          await this.runRagTool(
            userId,
            intent.searchQuery ?? request.message,
            toolsUsed,
            toolResults,
            citations,
            actions,
          );
        }
        break;
      case 'calendar_agenda':
        if (copilot) {
          await this.runCalendarAgendaTool(userId, toolsUsed, toolResults, actions);
        } else {
          await this.runRagTool(
            userId,
            intent.searchQuery ?? request.message,
            toolsUsed,
            toolResults,
            citations,
            actions,
          );
        }
        break;
      case 'propose_reminder':
        if (copilot) {
          await this.runProposeReminderTool(
            request.message,
            intent.reminderTitle,
            toolsUsed,
            toolResults,
            actions,
            proposals,
          );
        } else {
          toolResults.proposal = {
            error: 'copilot_required',
            hint: 'Enable Financial Copilot to create reminders from chat.',
          };
        }
        break;
      case 'catalog_qa':
      case 'general':
      default:
        await this.runRagTool(
          userId,
          intent.searchQuery ?? request.message,
          toolsUsed,
          toolResults,
          citations,
          actions,
        );
        break;
    }

    const reply = await this.composeReply({
      message: request.message,
      history,
      userContext,
      toolsUsed,
      toolResults,
      copilot,
    });

    const results = this.buildResults(
      toolResults,
      citations,
      actions,
      userContext,
      request.message,
    );
    const message = this.formatMessageForResults(reply.message, request.message, results);

    const response: AssistantChatResponse = {
      conversationId,
      message,
      readOnly: proposals.length === 0,
      mode: copilot ? 'copilot' : 'assistant',
      confidence: reply.confidence,
      toolsUsed,
      citations,
      actions,
      results,
      proposals,
    };

    await this.persistTurn(userId, conversationId, request.message, response);

    return response;
  }

  async confirmProposal(
    userId: string,
    input: { conversationId: string; proposalId: string; confirmed: boolean },
  ): Promise<AssistantConfirmProposalResult> {
    const { copilot } = await this.assertChatEnabled(userId);
    if (!copilot) {
      throw new BadRequestException('Proposal confirmation requires Financial Copilot');
    }

    const proposal = await this.findProposal(userId, input.conversationId, input.proposalId);
    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }
    if (proposal.status !== 'pending') {
      return {
        ok: false,
        proposalId: proposal.id,
        status: proposal.status,
        reminderId: null,
        detail: `Proposal is already ${proposal.status}`,
      };
    }

    if (!input.confirmed) {
      await this.markProposalStatus(userId, input.conversationId, proposal.id, 'cancelled');
      return {
        ok: true,
        proposalId: proposal.id,
        status: 'cancelled',
        reminderId: null,
        detail: 'Reminder proposal cancelled — nothing was saved.',
      };
    }

    try {
      const reminder = await this.calendar.createReminder(userId, proposal.payload);
      await this.markProposalStatus(userId, input.conversationId, proposal.id, 'confirmed');
      return {
        ok: true,
        proposalId: proposal.id,
        status: 'confirmed',
        reminderId: reminder.id,
        detail: `Reminder saved: ${reminder.title} on ${reminder.eventDate.slice(0, 10)}.`,
      };
    } catch (error) {
      return {
        ok: false,
        proposalId: proposal.id,
        status: 'pending',
        reminderId: null,
        detail: error instanceof Error ? error.message : 'Could not save reminder',
      };
    }
  }

  private async resolveConversationId(userId: string, conversationId?: string): Promise<string> {
    if (conversationId) {
      const existing = await this.prisma.assistantConversation.findFirst({
        where: { id: conversationId, userId },
        select: { id: true },
      });
      if (!existing) {
        throw new NotFoundException('Conversation not found');
      }
      return conversationId;
    }

    const id = newUuidV7();
    await this.prisma.assistantConversation.create({
      data: { id, userId },
    });
    return id;
  }

  private async loadConversationHistory(
    userId: string,
    conversationId: string,
    clientHistory?: AssistantChatRequest['history'],
  ): Promise<AssistantChatMessage[]> {
    const stored = await this.prisma.assistantChatMessage.findMany({
      where: { conversationId, conversation: { userId } },
      orderBy: { createdAt: 'asc' },
      take: MAX_HISTORY_TURNS,
      select: { role: true, content: true },
    });

    if (stored.length > 0) {
      return stored.map((message) => ({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: message.content,
      }));
    }

    return clientHistory ?? [];
  }

  private async persistTurn(
    userId: string,
    conversationId: string,
    userMessage: string,
    response: AssistantChatResponse,
  ): Promise<void> {
    const assistantMetadata: AssistantMessageMetadata = {
      confidence: response.confidence,
      toolsUsed: response.toolsUsed,
      citations: response.citations,
      results: response.results,
      proposals: response.proposals,
      mode: response.mode,
    };

    await this.prisma.$transaction([
      this.prisma.assistantChatMessage.create({
        data: {
          id: newUuidV7(),
          conversationId,
          role: 'user',
          content: userMessage,
        },
      }),
      this.prisma.assistantChatMessage.create({
        data: {
          id: newUuidV7(),
          conversationId,
          role: 'assistant',
          content: response.message,
          metadata: assistantMetadata as Prisma.InputJsonValue,
        },
      }),
      this.prisma.assistantConversation.update({
        where: { id: conversationId, userId },
        data: { updatedAt: new Date() },
      }),
    ]);

    const overflow = await this.prisma.assistantChatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      skip: MAX_STORED_MESSAGES,
      select: { id: true },
    });

    if (overflow.length > 0) {
      await this.prisma.assistantChatMessage.deleteMany({
        where: { id: { in: overflow.map((row) => row.id) } },
      });
    }
  }

  private formatMessageForResults(
    message: string,
    question: string,
    results: AssistantResultItem[],
  ): string {
    if (results.length === 0) return message;

    if (this.isCatalogBenefitQuestion(question)) {
      if (/\bforex\b|\bmarkup\b|\binternational\b/i.test(question)) {
        return 'Here are catalog cards with forex-related benefits:';
      }
      return 'Here’s what I found in the catalog:';
    }

    if (results.some((row) => row.kind === 'portfolio_card')) {
      return 'These cards from your portfolio match:';
    }

    if (message.length > 220 && results.length >= 2) {
      return 'Here are the top matches:';
    }

    return message;
  }

  private buildResults(
    toolResults: Record<string, unknown>,
    citations: RagCitation[],
    actions: AssistantAction[],
    userContext: UserAiContext,
    question: string,
  ): AssistantResultItem[] {
    const results: AssistantResultItem[] = [];
    const seen = new Set<string>();
    const portfolioBySlug = new Map(userContext.portfolioCards.map((card) => [card.slug, card]));
    const actionUserCardIdBySlug = new Map(
      actions
        .filter((action) => action.type === 'VIEW_CARD' && action.slug && action.id)
        .map((action) => [action.slug!, action.id!]),
    );

    const rag = toolResults.rag as
      | {
          chunks?: Array<{
            title: string;
            excerpt: string;
            slug: string;
            entityType: string;
          }>;
        }
      | undefined;

    if (rag?.chunks) {
      for (const chunk of rag.chunks) {
        if (seen.has(`${chunk.entityType}:${chunk.slug}`)) continue;
        const citation = citations.find(
          (row) => row.slug === chunk.slug && row.entityType === chunk.entityType,
        );
        if (!citation) continue;
        seen.add(`${chunk.entityType}:${chunk.slug}`);

        if (chunk.entityType === 'merchant') {
          results.push({
            kind: 'merchant',
            id: citation.id,
            slug: chunk.slug,
            title: chunk.title,
            subtitle: chunk.excerpt !== chunk.title ? chunk.excerpt : undefined,
          });
          continue;
        }

        const owned = portfolioBySlug.get(chunk.slug);
        const userCardId = actionUserCardIdBySlug.get(chunk.slug);
        results.push({
          kind: owned || userCardId ? 'portfolio_card' : 'card',
          id: citation.id,
          slug: chunk.slug,
          title: chunk.title,
          subtitle: parseCardSubtitle(chunk.excerpt),
          highlights: parseCardHighlights(chunk.excerpt),
          badge: owned?.isFavorite ? 'Favorite' : undefined,
          inPortfolio: Boolean(owned || userCardId),
          ...(userCardId ? { userCardId } : {}),
        });
      }
    }

    const reco = toolResults.recommendation as
      | {
          recommendedCard?: {
            name: string;
            slug: string;
            expectedRewardInr?: number;
            explanation?: string;
            shortSummary?: string;
          } | null;
          alternatives?: Array<{
            name: string;
            slug: string;
            expectedRewardInr?: number;
          }>;
          merchant?: string | null;
        }
      | undefined;

    if (reco?.recommendedCard) {
      const card = reco.recommendedCard;
      const key = `card:${card.slug}`;
      const userCardId = actionUserCardIdBySlug.get(card.slug);
      const citation = citations.find((row) => row.slug === card.slug);
      const entityId = citation?.id ?? userCardId;
      if (!seen.has(key) && entityId) {
        seen.add(key);
        results.unshift({
          kind: 'portfolio_card',
          id: entityId,
          slug: card.slug,
          title: card.name,
          subtitle: reco.merchant ? `Best for ${reco.merchant}` : undefined,
          highlights: [
            ...(card.shortSummary ? [card.shortSummary] : []),
            ...(card.explanation ? [card.explanation] : []),
            ...(card.expectedRewardInr != null
              ? [`Expected reward ₹${Math.round(card.expectedRewardInr)}`]
              : []),
          ].slice(0, 4),
          badge: 'Recommended',
          inPortfolio: true,
          ...(userCardId ? { userCardId } : {}),
        });
      }
    }

    const portfolio = toolResults.portfolio as
      | {
          cards?: Array<{
            name: string;
            slug: string;
            bank: string;
            isFavorite: boolean;
            benefitHighlights: string[];
          }>;
        }
      | undefined;

    if (portfolio?.cards) {
      for (const card of portfolio.cards) {
        const key = `card:${card.slug}`;
        if (seen.has(key)) continue;
        const userCardId = actionUserCardIdBySlug.get(card.slug);
        if (!userCardId) continue;
        seen.add(key);
        results.push({
          kind: 'portfolio_card',
          id: userCardId,
          slug: card.slug,
          title: card.name,
          subtitle: card.bank,
          highlights: card.benefitHighlights.slice(0, 4),
          badge: card.isFavorite ? 'Favorite' : undefined,
          inPortfolio: true,
          userCardId,
        });
      }
    }

    return this.filterResultsForQuestion(results, question).slice(0, 6);
  }

  private filterResultsForQuestion(
    results: AssistantResultItem[],
    question: string,
  ): AssistantResultItem[] {
    if (!this.isCatalogBenefitQuestion(question)) return results;

    const terms = question.toLowerCase();
    const isForexQuestion = /\bforex\b|\bmarkup\b|\binternational\b/.test(terms);
    if (!isForexQuestion) return results;

    const filtered = results.filter((result) => {
      if (result.kind === 'merchant') return true;
      const haystack = [result.title, result.subtitle ?? '', ...(result.highlights ?? [])]
        .join(' ')
        .toLowerCase();
      return /\bforex\b|\bmarkup\b|\binternational\b|0%/.test(haystack);
    });

    return filtered.length > 0 ? filtered : results.slice(0, 3);
  }

  private resolveIntent(
    message: string,
    intent: AssistantIntentOutput,
    copilot = false,
  ): AssistantIntentOutput {
    if (copilot) {
      if (looksLikeReminderRequest(message)) {
        return {
          intent: 'propose_reminder',
          reminderTitle: intent.reminderTitle ?? parseReminderHints(message).title,
        };
      }
      if (looksLikeWeeklyOptimize(message)) {
        return { intent: 'weekly_optimize' };
      }
      if (looksLikeCalendarAgenda(message)) {
        return { intent: 'calendar_agenda' };
      }
    }

    if (this.isCatalogBenefitQuestion(message)) {
      return {
        intent: 'catalog_qa',
        searchQuery: this.normalizeCatalogSearchQuery(message, intent.searchQuery),
      };
    }

    if (intent.intent === 'recommendation') {
      return this.enrichRecommendationIntent(message, intent);
    }

    if (intent.intent === 'catalog_qa' && !intent.searchQuery) {
      return { ...intent, searchQuery: this.normalizeCatalogSearchQuery(message) };
    }

    return intent;
  }

  /** Benefit/feature lookups — including "best card for forex". */
  private isCatalogBenefitQuestion(message: string): boolean {
    if (this.isBenefitTopicQuestion(message)) {
      return true;
    }

    if (this.looksLikePurchaseRecommendation(message)) {
      return false;
    }

    const lower = message.toLowerCase();

    const benefitKeywords =
      /\b(?:forex|markup|cashback|lounge|reward|miles|annual fee|0%|zero fee|dining|fuel|travel|airport|benefit|feature|compare|versus|vs\.?|utilization|utilisation|transaction)\b/i;
    const catalogPhrases =
      /\b(?:which cards?\s+(?:has|have|offer|with|includes?)|what cards?\s+(?:has|have|offer|with|is)|find (?:a )?cards?|cards?\s+with|cards?\s+(?:has|have|offering|that offer)|best .*(?:forex|cashback|rewards?|lounge)|0%\s*forex|forex (?:markup|fee|return|charge|transaction|utilization|utilisation))\b/i;

    return benefitKeywords.test(lower) || catalogPhrases.test(lower);
  }

  /** True when "best card for X" refers to a benefit topic, not a merchant checkout. */
  private isBenefitTopicQuestion(message: string): boolean {
    const lower = message.toLowerCase();

    const benefitTopics =
      /\b(?:forex|foreign exchange|international|markup|cashback|lounge|airport|reward points?|miles|annual fee|fuel surcharge|travel perks?|dining rewards?|utilization|utilisation)\b/i;

    if (!benefitTopics.test(lower)) {
      return false;
    }

    const catalogIntent =
      /\b(?:best|top|good|great|ideal|which|what|compare|find|recommend|suggest)\b.*\b(?:card|cards)\b/i.test(
        lower,
      ) ||
      /\b(?:card|cards)\b.*\b(?:best|top|good|for forex|for international|for lounge|for cashback)\b/i.test(
        lower,
      ) ||
      /\bbest card for\b/i.test(lower);

    return catalogIntent;
  }

  private looksLikePurchaseRecommendation(message: string): boolean {
    if (this.isBenefitTopicQuestion(message)) {
      return false;
    }

    const lower = message.toLowerCase();
    return (
      /\bshould i use\b/.test(lower) ||
      /\bwhich card should\b/.test(lower) ||
      /\bbest card (?:for|at|to use)\b/.test(lower) ||
      /\buse (?:at|for|on)\b/.test(lower) ||
      (/\b(?:at|from)\s+[a-z0-9]/i.test(message) && /\bfor\s+(?:₹|rs\.?\s*)?[\d,]+/i.test(message))
    );
  }

  private normalizeCatalogSearchQuery(message: string, modelQuery?: string): string {
    const lower = message.toLowerCase();
    if (
      /\bforex\b|\bforeign exchange\b|\binternational\b|\bmarkup\b|\butilization\b|\butilisation\b/.test(
        lower,
      )
    ) {
      return modelQuery?.trim() || 'forex markup international card benefits zero percent';
    }
    return modelQuery?.trim() || message;
  }

  private enrichRecommendationIntent(
    message: string,
    intent: AssistantIntentOutput,
  ): AssistantIntentOutput {
    const parsed = this.parsePurchaseHints(message);
    return {
      ...intent,
      merchantName: intent.merchantName ?? parsed.merchantName,
      merchantSlug: intent.merchantSlug ?? parsed.merchantSlug,
      categorySlug: intent.categorySlug ?? parsed.categorySlug,
      amount: intent.amount ?? parsed.amount,
    };
  }

  private parsePurchaseHints(
    message: string,
  ): Pick<AssistantIntentOutput, 'merchantName' | 'merchantSlug' | 'categorySlug' | 'amount'> {
    const amountMatch = message.match(/(?:₹|rs\.?\s*|inr\s*)?([\d][\d,]*)\s*(?:rupees?)?/i);
    const amount = amountMatch ? Number(amountMatch[1]!.replace(/,/g, '')) : undefined;
    const merchantMatch = message.match(
      /\bat\s+([A-Za-z0-9][A-Za-z0-9\s&'.-]{1,40}?)(?:\s+for\b|[?.!,]|$)/i,
    );
    const merchantName = merchantMatch?.[1]?.trim();

    return {
      ...(merchantName ? { merchantName } : {}),
      ...(amount && Number.isFinite(amount) ? { amount } : {}),
    };
  }

  private async classifyIntentSafely(
    message: string,
    history: AssistantChatRequest['history'],
    userContext: UserAiContext,
    copilot = false,
  ): Promise<AssistantIntentOutput | null> {
    try {
      const result = await classifyAssistantIntent({
        message,
        history: history ?? [],
        userContext,
        copilot,
      });
      return result.data;
    } catch {
      return null;
    }
  }

  private fallbackIntent(message: string, copilot = false): AssistantIntentOutput {
    const lower = message.toLowerCase();

    if (copilot) {
      if (looksLikeReminderRequest(message)) {
        return {
          intent: 'propose_reminder',
          reminderTitle: parseReminderHints(message).title,
        };
      }
      if (looksLikeWeeklyOptimize(message)) {
        return { intent: 'weekly_optimize' };
      }
      if (looksLikeCalendarAgenda(message)) {
        return { intent: 'calendar_agenda' };
      }
    }

    if (this.isCatalogBenefitQuestion(message)) {
      return { intent: 'catalog_qa', searchQuery: this.normalizeCatalogSearchQuery(message) };
    }

    if (this.looksLikePurchaseRecommendation(message)) {
      return {
        intent: 'recommendation',
        ...this.parsePurchaseHints(message),
      };
    }

    if (/(my cards|portfolio|cards do i|what cards)/i.test(lower)) {
      return { intent: 'list_cards' };
    }

    return { intent: 'catalog_qa', searchQuery: message };
  }

  private async runRecommendationTool(
    userId: string,
    intent: {
      merchantSlug?: string;
      merchantName?: string;
      categorySlug?: string;
      amount?: number;
    },
    toolsUsed: AssistantToolName[],
    toolResults: Record<string, unknown>,
    actions: AssistantAction[],
  ): Promise<void> {
    toolsUsed.push('getRecommendation');

    const hasContext = Boolean(intent.merchantSlug || intent.merchantName || intent.categorySlug);
    if (!hasContext) {
      toolResults.recommendation = {
        error: 'missing_context',
        hint: 'Ask which merchant or category the purchase is for.',
      };
      return;
    }

    try {
      const result = await this.recommendations.recommendBestCard(userId, {
        amount: intent.amount ?? 1000,
        ...(intent.merchantSlug ? { merchantSlug: intent.merchantSlug } : {}),
        ...(intent.merchantName ? { merchantAlias: intent.merchantName } : {}),
        ...(intent.categorySlug ? { categorySlug: intent.categorySlug } : {}),
      });

      toolResults.recommendation = {
        amount: result.amount,
        merchant: result.merchant?.name ?? null,
        recommendedCard: result.recommendedCard
          ? {
              name: result.recommendedCard.cardName,
              slug: result.recommendedCard.cardSlug,
              expectedRewardInr: result.recommendedCard.expectedRewardInr,
              explanation: result.explanation,
              shortSummary: result.shortSummary,
            }
          : null,
        alternatives: result.alternatives.slice(0, 2).map((row) => ({
          name: row.cardName,
          slug: row.cardSlug,
          expectedRewardInr: row.expectedRewardInr,
        })),
      };

      if (result.recommendedCard?.cardSlug) {
        actions.push({
          type: 'VIEW_CARD',
          id: result.recommendedCard.userCardId,
          slug: result.recommendedCard.cardSlug,
          label: result.recommendedCard.cardName,
        });
      }
      if (result.merchant?.slug) {
        actions.push({
          type: 'VIEW_MERCHANT',
          id: result.merchant.id,
          slug: result.merchant.slug,
          label: result.merchant.name,
        });
      }
    } catch (error) {
      toolResults.recommendation = {
        error: error instanceof Error ? error.message : 'Recommendation unavailable',
      };
    }
  }

  private async runListCardsTool(
    userId: string,
    userContext: UserAiContext,
    toolsUsed: AssistantToolName[],
    toolResults: Record<string, unknown>,
    actions: AssistantAction[],
  ): Promise<void> {
    toolsUsed.push('listCards');

    const cards = await this.portfolio.listPortfolio(userId);
    toolResults.portfolio = {
      count: userContext.portfolioCount,
      favorites: userContext.favoriteCount,
      cards: cards.map((row) => ({
        name: row.card.name,
        slug: row.card.slug,
        bank: row.card.bank.name,
        isFavorite: row.isFavorite,
        benefitHighlights: row.topBenefits.slice(0, 3),
      })),
    };

    for (const row of cards.slice(0, 3)) {
      actions.push({
        type: 'VIEW_CARD',
        id: row.id,
        slug: row.card.slug,
        label: row.card.name,
      });
    }
  }

  private async runRagTool(
    userId: string,
    query: string,
    toolsUsed: AssistantToolName[],
    toolResults: Record<string, unknown>,
    citations: RagCitation[],
    actions: AssistantAction[],
  ): Promise<void> {
    try {
      toolsUsed.push('rag');
      const rag = await this.rag.answer(userId, { q: query, types: ['card', 'merchant'] });
      toolResults.rag = {
        source: rag.source,
        answer: rag.answer.answer,
        chunks: rag.chunks.slice(0, 6).map((chunk) => ({
          title: chunk.title,
          excerpt: chunk.excerpt,
          slug: chunk.slug,
          entityType: chunk.entityType,
          id: chunk.citation.id,
        })),
      };

      citations.push(...rag.answer.citations);

      for (const citation of rag.answer.citations.slice(0, 3)) {
        actions.push(
          citation.entityType === 'card'
            ? { type: 'VIEW_CARD', id: citation.id, slug: citation.slug, label: citation.label }
            : {
                type: 'VIEW_MERCHANT',
                id: citation.id,
                slug: citation.slug,
                label: citation.label,
              },
        );
      }
    } catch (error) {
      toolResults.rag = {
        error: error instanceof Error ? error.message : 'RAG unavailable',
      };
    }
  }

  private async composeReply(input: {
    message: string;
    history: Array<{ role: string; content: string }>;
    userContext: UserAiContext;
    toolsUsed: AssistantToolName[];
    toolResults: Record<string, unknown>;
    copilot?: boolean;
  }): Promise<{ message: string; confidence: 'high' | 'medium' | 'low' }> {
    if (!isAiConfigured()) {
      return {
        message: this.templateReply(input.toolResults, input.message),
        confidence: 'low',
      };
    }

    const templated = this.templateReply(input.toolResults, input.message);
    const templatedIsGeneric = templated.startsWith('I could not find enough information');

    if (
      input.toolsUsed.includes('getWeeklyOptimization') ||
      input.toolsUsed.includes('getCalendarAgenda') ||
      input.toolsUsed.includes('proposeReminder')
    ) {
      if (!templatedIsGeneric) {
        return { message: templated, confidence: 'high' };
      }
    }

    if (input.toolsUsed.includes('rag') && toolResultsHasRagAnswer(input.toolResults)) {
      if (!templatedIsGeneric) {
        return { message: templated, confidence: 'medium' };
      }
    }

    if (
      input.toolsUsed.includes('getRecommendation') &&
      !templatedIsGeneric &&
      !isMissingContextRecommendation(input.toolResults)
    ) {
      return {
        message: templated,
        confidence: 'medium',
      };
    }

    try {
      const result = await generateAssistantTurn({
        message: input.message,
        history: input.history,
        userContext: input.userContext,
        toolsUsed: input.toolsUsed,
        toolResults: input.toolResults,
        copilot: input.copilot,
      });
      return result.data;
    } catch {
      return {
        message: this.templateReply(input.toolResults, input.message),
        confidence: 'low',
      };
    }
  }

  private async runWeeklyOptimizeTool(
    userId: string,
    userContext: UserAiContext,
    toolsUsed: AssistantToolName[],
    toolResults: Record<string, unknown>,
    actions: AssistantAction[],
  ): Promise<void> {
    toolsUsed.push('getWeeklyOptimization');
    try {
      const [wallet, milestones, agenda] = await Promise.all([
        this.rewardWallet.getOverview(userId).catch(() => null),
        this.milestones.getSpendMilestones(userId).catch(() => null),
        this.calendar.getAgenda(userId, { days: 14 }).catch(() => null),
      ]);

      const summary = buildWeeklyOptimizationSummary({
        portfolioCount: userContext.portfolioCount,
        favoriteCount: userContext.favoriteCount,
        preferredRewardType: userContext.preferredRewardType ?? null,
        preferredCategorySlugs: userContext.preferredCategorySlugs ?? [],
        walletEstimatedValueInr: wallet?.totalEstimatedValueInr ?? 0,
        expiringSoonCount: wallet?.expiringSoon?.length ?? 0,
        milestoneInProgress: milestones?.inProgressCount ?? 0,
        upcomingAgendaCount: agenda?.items?.length ?? 0,
      });

      toolResults.weeklyOptimization = summary;
      actions.push(
        { type: 'OPEN_WALLET', label: 'Open rewards wallet' },
        { type: 'OPEN_MILESTONES', label: 'Open milestones' },
        { type: 'OPEN_CALENDAR', label: 'Open calendar' },
      );
    } catch (error) {
      toolResults.weeklyOptimization = {
        error: error instanceof Error ? error.message : 'Weekly optimization unavailable',
      };
    }
  }

  private async runCalendarAgendaTool(
    userId: string,
    toolsUsed: AssistantToolName[],
    toolResults: Record<string, unknown>,
    actions: AssistantAction[],
  ): Promise<void> {
    toolsUsed.push('getCalendarAgenda');
    try {
      const agenda = await this.calendar.getAgenda(userId, { days: 14 });
      toolResults.calendarAgenda = {
        from: agenda.from,
        to: agenda.to,
        count: agenda.items.length,
        items: agenda.items.slice(0, 8).map((item) => ({
          id: item.id,
          title: item.title,
          date: item.date,
          type: item.type,
        })),
      };
      actions.push({ type: 'OPEN_CALENDAR', label: 'Open calendar' });
    } catch (error) {
      toolResults.calendarAgenda = {
        error: error instanceof Error ? error.message : 'Calendar agenda unavailable',
      };
    }
  }

  private async runProposeReminderTool(
    message: string,
    reminderTitle: string | undefined,
    toolsUsed: AssistantToolName[],
    toolResults: Record<string, unknown>,
    actions: AssistantAction[],
    proposals: AssistantProposal[],
  ): Promise<void> {
    toolsUsed.push('proposeReminder');
    const hints = parseReminderHints(message);
    const proposal = buildReminderProposal({
      title: reminderTitle?.trim() || hints.title,
      eventDateIso: hints.eventDateIso,
      description: `Proposed by Financial Copilot from: "${message.slice(0, 160)}"`,
      reminderOffsetDays: Math.min(7, Math.max(0, hints.daysAhead > 1 ? 1 : 0)),
      priority: 'medium',
    });
    proposals.push(proposal);
    toolResults.reminderProposal = {
      id: proposal.id,
      label: proposal.label,
      detail: proposal.detail,
      status: proposal.status,
    };
    actions.push({
      type: 'CONFIRM_PROPOSAL',
      id: proposal.id,
      label: 'Confirm reminder',
    });
    actions.push({ type: 'OPEN_CALENDAR', label: 'Open calendar' });
  }

  private async findLatestPendingProposal(
    userId: string,
    conversationId: string,
  ): Promise<AssistantProposal | null> {
    const messages = await this.prisma.assistantChatMessage.findMany({
      where: { conversationId, conversation: { userId }, role: 'assistant' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { metadata: true },
    });

    for (const message of messages) {
      const meta =
        message.metadata && typeof message.metadata === 'object'
          ? (message.metadata as AssistantMessageMetadata)
          : undefined;
      const pending = meta?.proposals?.find((row) => row.status === 'pending');
      if (pending) return pending;
    }
    return null;
  }

  private async findProposal(
    userId: string,
    conversationId: string,
    proposalId: string,
  ): Promise<AssistantProposal | null> {
    const messages = await this.prisma.assistantChatMessage.findMany({
      where: { conversationId, conversation: { userId }, role: 'assistant' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { metadata: true },
    });

    for (const message of messages) {
      const meta =
        message.metadata && typeof message.metadata === 'object'
          ? (message.metadata as AssistantMessageMetadata)
          : undefined;
      const match = meta?.proposals?.find((row) => row.id === proposalId);
      if (match) return match;
    }
    return null;
  }

  private async markProposalStatus(
    userId: string,
    conversationId: string,
    proposalId: string,
    status: AssistantProposal['status'],
  ): Promise<void> {
    const messages = await this.prisma.assistantChatMessage.findMany({
      where: { conversationId, conversation: { userId }, role: 'assistant' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, metadata: true },
    });

    for (const message of messages) {
      const meta =
        message.metadata && typeof message.metadata === 'object'
          ? (message.metadata as AssistantMessageMetadata)
          : undefined;
      if (!meta?.proposals?.some((row) => row.id === proposalId)) continue;

      const nextMeta: AssistantMessageMetadata = {
        ...meta,
        proposals: meta.proposals.map((row) => (row.id === proposalId ? { ...row, status } : row)),
      };
      await this.prisma.assistantChatMessage.update({
        where: { id: message.id },
        data: { metadata: nextMeta as Prisma.InputJsonValue },
      });
      return;
    }
  }

  private templateReply(toolResults: Record<string, unknown>, userMessage?: string): string {
    const weekly = toolResults.weeklyOptimization as
      | { headline?: string; bullets?: string[]; recommendedFocus?: string; error?: string }
      | undefined;
    if (weekly?.error) {
      return `I couldn't build your weekly optimization (${weekly.error}).`;
    }
    if (weekly?.headline && weekly.bullets?.length) {
      return `${weekly.headline}. ${weekly.bullets.join(' ')} Focus: ${weekly.recommendedFocus ?? 'stay consistent'}.`;
    }

    const agenda = toolResults.calendarAgenda as
      | {
          count?: number;
          from?: string;
          to?: string;
          items?: Array<{ title: string; date: string }>;
          error?: string;
        }
      | undefined;
    if (agenda?.error) {
      return `I couldn't load your agenda (${agenda.error}).`;
    }
    if (agenda && agenda.count != null) {
      if (agenda.count === 0) {
        return `No upcoming calendar items from ${agenda.from} to ${agenda.to}.`;
      }
      const preview = (agenda.items ?? [])
        .slice(0, 3)
        .map((item) => `${item.title} (${item.date})`)
        .join('; ');
      return `You have ${agenda.count} upcoming item${agenda.count === 1 ? '' : 's'} through ${agenda.to}: ${preview}.`;
    }

    const proposal = toolResults.reminderProposal as
      | { label?: string; detail?: string; error?: string }
      | undefined;
    if (proposal?.error === 'copilot_required') {
      return 'Enable Financial Copilot to create reminders from chat.';
    }
    if (proposal?.label) {
      return `${proposal.detail ?? proposal.label} Reply "confirm" to save it.`;
    }

    const rag = toolResults.rag as { answer?: string; chunks?: unknown[] } | undefined;
    if (rag?.answer) return rag.answer;

    const reco = toolResults.recommendation as
      | { recommendedCard?: { name: string; explanation?: string } | null; error?: string }
      | undefined;
    if (reco?.recommendedCard) {
      return `${reco.recommendedCard.name} is the best pick. ${reco.recommendedCard.explanation ?? ''}`.trim();
    }
    if (reco?.error === 'missing_context') {
      if (userMessage && this.isCatalogBenefitQuestion(userMessage)) {
        return 'I searched the catalog for matching card benefits — check the citations for cards that may fit. Try rephrasing with a specific benefit like "0% forex markup".';
      }
      return 'Tell me the merchant or category and amount so I can recommend the best card from your portfolio.';
    }
    if (reco?.error) {
      return `I couldn't run that recommendation (${reco.error}). Try searching Merchants for the store name, or add cards to your portfolio first.`;
    }

    const portfolio = toolResults.portfolio as { cards?: Array<{ name: string }> } | undefined;
    if (portfolio?.cards?.length) {
      const names = portfolio.cards.map((card) => card.name).join(', ');
      return `You have ${portfolio.cards.length} card(s) in your portfolio: ${names}.`;
    }

    return 'I could not find enough information to answer that yet. Try asking about a specific card benefit or merchant.';
  }
}

function toolResultsHasRagAnswer(toolResults: Record<string, unknown>): boolean {
  const rag = toolResults.rag as { answer?: string } | undefined;
  return Boolean(rag?.answer?.trim());
}

function isMissingContextRecommendation(toolResults: Record<string, unknown>): boolean {
  const reco = toolResults.recommendation as { error?: string } | undefined;
  return reco?.error === 'missing_context';
}

function parseCardSubtitle(excerpt: string): string | undefined {
  const parts = excerpt
    .split(' · ')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) return `${parts[0]} · ${parts[1]}`;
  return parts[0];
}

function parseCardHighlights(excerpt: string): string[] {
  const parts = excerpt
    .split(' · ')
    .map((part) => part.trim())
    .filter(Boolean);
  const highlights = parts.length <= 2 ? parts.slice(1) : parts.slice(2);
  return highlights.filter((line) => !/^\d+\s+benefits?$/i.test(line));
}
