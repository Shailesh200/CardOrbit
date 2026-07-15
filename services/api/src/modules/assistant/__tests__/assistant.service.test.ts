import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FeatureFlag } from '@cardwise/feature-flags';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { AiService } from '../../ai/ai.service';
import { FinancialCalendarService } from '../../financial-calendar/financial-calendar.service';
import { MilestonesService } from '../../milestones/milestones.service';
import { RecommendationsService } from '../../recommendations/recommendations.service';
import { ContextEngineService } from '../../rag/context-engine.service';
import { RagService } from '../../rag/rag.service';
import { RewardWalletService } from '../../reward-wallet/reward-wallet.service';
import { UserCardsService } from '../../user-cards/user-cards.service';
import { AssistantService } from '../assistant.service';

const classifyAssistantIntent = vi.fn();
const generateAssistantTurn = vi.fn();

const CARD_ID = '019f52a4-c692-727d-b386-e925a3c8aecc';
const CONVERSATION_ID = '019f52a4-c692-727d-b386-e925a3c8ae01';

vi.mock('@cardwise/ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cardwise/ai')>();
  return {
    ...actual,
    classifyAssistantIntent: (...args: unknown[]) => classifyAssistantIntent(...args),
    generateAssistantTurn: (...args: unknown[]) => generateAssistantTurn(...args),
    isAiConfigured: () => true,
  };
});

vi.mock('../../../infrastructure/prisma/uuid', () => ({
  newUuidV7: vi.fn(() => CONVERSATION_ID),
}));

describe('AssistantService', () => {
  const ai = { isFeatureEnabled: vi.fn() } as unknown as AiService;
  const contextEngine = { buildUserContext: vi.fn() } as unknown as ContextEngineService;
  const rag = { answer: vi.fn() } as unknown as RagService;
  const recommendations = { recommendBestCard: vi.fn() } as unknown as RecommendationsService;
  const portfolio = { listPortfolio: vi.fn() } as unknown as UserCardsService;
  const rewardWallet = { getOverview: vi.fn() } as unknown as RewardWalletService;
  const milestones = { getSpendMilestones: vi.fn() } as unknown as MilestonesService;
  const calendar = {
    getAgenda: vi.fn(),
    createReminder: vi.fn(),
  } as unknown as FinancialCalendarService;
  const prisma = {
    assistantConversation: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    assistantChatMessage: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  } as unknown as PrismaService;

  const service = new AssistantService(
    ai,
    contextEngine,
    rag,
    recommendations,
    portfolio,
    rewardWallet,
    milestones,
    calendar,
    prisma,
  );

  const userContext = {
    preferredRewardType: 'cashback',
    preferredCategorySlugs: ['dining'],
    boostFavoriteCards: true,
    portfolioCount: 1,
    favoriteCount: 1,
    portfolioCards: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    ai.isFeatureEnabled = vi.fn().mockResolvedValue(true);
    contextEngine.buildUserContext = vi.fn().mockResolvedValue(userContext);
    prisma.assistantConversation.findFirst = vi.fn().mockResolvedValue(null);
    prisma.assistantConversation.create = vi.fn().mockResolvedValue({ id: CONVERSATION_ID });
    prisma.assistantConversation.update = vi.fn().mockResolvedValue({});
    prisma.assistantChatMessage.findMany = vi.fn().mockResolvedValue([]);
    prisma.assistantChatMessage.create = vi.fn().mockResolvedValue({});
    prisma.assistantChatMessage.deleteMany = vi.fn().mockResolvedValue({ count: 0 });
    classifyAssistantIntent.mockResolvedValue({
      data: { intent: 'catalog_qa', searchQuery: '0% forex card' },
    });
    generateAssistantTurn.mockResolvedValue({
      data: {
        message: 'The IDFC FIRST Private card offers 0% forex markup.',
        confidence: 'high',
      },
    });
    rag.answer = vi.fn().mockResolvedValue({
      source: 'semantic',
      answer: {
        answer: 'The IDFC FIRST Private card offers 0% forex markup.',
        citations: [
          {
            entityType: 'card',
            id: CARD_ID,
            slug: 'idfc-first-first-private',
            label: 'IDFC FIRST Private Credit Card',
          },
        ],
        confidence: 'high',
      },
      chunks: [
        {
          id: 'card:idfc-first-first-private',
          entityType: 'card',
          slug: 'idfc-first-first-private',
          title: 'IDFC FIRST Private Credit Card',
          excerpt: 'IDFC FIRST Bank · Visa · Forex markup: 0% on international transactions',
          score: 0.9,
          citation: {
            entityType: 'card',
            id: CARD_ID,
            slug: 'idfc-first-first-private',
            label: 'IDFC FIRST Private Credit Card',
          },
        },
      ],
      userContext,
      query: '0% forex card',
    });
  });

  it('returns assistant status when enabled', async () => {
    const status = await service.getStatus('user-1');
    expect(status.enabled).toBe(true);
    expect(status.configured).toBe(true);
    expect(status.mode).toBe('copilot');
    expect(status.copilotEnabled).toBe(true);
  });

  it('routes catalog questions through RAG and composes a reply', async () => {
    const result = await service.chat('user-1', { message: 'Which card has 0% forex?' });

    expect(rag.answer).toHaveBeenCalledWith('user-1', {
      q: '0% forex card',
      types: ['card', 'merchant'],
    });
    expect(result.toolsUsed).toContain('rag');
    expect(result.readOnly).toBe(true);
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0]?.title).toContain('IDFC FIRST Private');
    expect(result.actions[0]?.type).toBe('VIEW_CARD');
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('uses listCards tool for portfolio questions', async () => {
    classifyAssistantIntent.mockResolvedValue({ data: { intent: 'list_cards' } });
    portfolio.listPortfolio = vi.fn().mockResolvedValue([
      {
        id: '019f52a4-c692-727d-b386-e925a3c8ae02',
        card: {
          name: 'HDFC Millennia',
          slug: 'hdfc-millennia',
          bank: { name: 'HDFC Bank' },
        },
        isFavorite: true,
        topBenefits: ['5% on dining'],
      },
    ]);

    const result = await service.chat('user-1', { message: 'What cards do I have?' });

    expect(result.toolsUsed).toContain('listCards');
    expect(portfolio.listPortfolio).toHaveBeenCalledWith('user-1');
    expect(result.actions[0]?.id).toBe('019f52a4-c692-727d-b386-e925a3c8ae02');
    expect(result.results[0]?.kind).toBe('portfolio_card');
  });

  it('rejects when assistant and copilot flags are disabled', async () => {
    ai.isFeatureEnabled = vi.fn().mockImplementation(async (flag: string) => {
      return flag !== FeatureFlag.AI_ASSISTANT_ENABLED && flag !== FeatureFlag.AI_COPILOT_ENABLED;
    });

    await expect(service.chat('user-1', { message: 'hello' })).rejects.toThrow(/disabled/i);
  });

  it('routes catalog forex questions through RAG even when model picks recommendation', async () => {
    classifyAssistantIntent.mockResolvedValue({
      data: { intent: 'recommendation', merchantName: 'Swiggy' },
    });

    const result = await service.chat('user-1', { message: 'which cards has 0% forex' });

    expect(recommendations.recommendBestCard).not.toHaveBeenCalled();
    expect(rag.answer).toHaveBeenCalledWith('user-1', {
      q: 'forex markup international card benefits zero percent',
      types: ['card', 'merchant'],
    });
    expect(result.toolsUsed).toContain('rag');
    expect(result.toolsUsed).not.toContain('getRecommendation');
    expect(result.results.length).toBeGreaterThan(0);
  });

  it('falls back to catalog RAG heuristics when intent classification fails', async () => {
    classifyAssistantIntent.mockRejectedValue(new SyntaxError('JSON Parse error'));

    const result = await service.chat('user-1', { message: 'which cards has 0% forex' });

    expect(rag.answer).toHaveBeenCalled();
    expect(result.toolsUsed).toContain('rag');
    expect(result.toolsUsed).not.toContain('getRecommendation');
  });

  it('routes "best card for forex" catalog questions through RAG', async () => {
    classifyAssistantIntent.mockResolvedValue({
      data: { intent: 'recommendation' },
    });

    const result = await service.chat('user-1', {
      message: 'best card for Forex utilisation',
    });

    expect(recommendations.recommendBestCard).not.toHaveBeenCalled();
    expect(rag.answer).toHaveBeenCalledWith('user-1', {
      q: 'forex markup international card benefits zero percent',
      types: ['card', 'merchant'],
    });
    expect(result.toolsUsed).toContain('rag');
    expect(result.toolsUsed).not.toContain('getRecommendation');
  });

  it('routes "best card for forex transactions" through RAG when model picks recommendation', async () => {
    classifyAssistantIntent.mockResolvedValue({
      data: { intent: 'recommendation', merchantName: 'Swiggy' },
    });

    const result = await service.chat('user-1', {
      message: 'what is the best card for Forex transactions',
    });

    expect(recommendations.recommendBestCard).not.toHaveBeenCalled();
    expect(rag.answer).toHaveBeenCalled();
    expect(result.toolsUsed).toContain('rag');
    expect(result.toolsUsed).not.toContain('getRecommendation');
    expect(result.message).not.toContain('Tell me the merchant');
  });

  it('falls back to heuristics when intent classification fails', async () => {
    classifyAssistantIntent.mockRejectedValue(new SyntaxError('JSON Parse error'));
    recommendations.recommendBestCard = vi.fn().mockResolvedValue({
      amount: 800,
      merchant: { id: '019f52a4-c692-727d-b386-e925a3c8ae03', name: 'Swiggy', slug: 'swiggy' },
      recommendedCard: {
        userCardId: '019f52a4-c692-727d-b386-e925a3c8ae02',
        cardName: 'HDFC Millennia',
        cardSlug: 'hdfc-millennia',
        expectedRewardInr: 40,
      },
      alternatives: [],
      explanation: '5% cashback on dining partners.',
      shortSummary: 'Best for Swiggy',
      explanationSource: 'template',
    });

    const result = await service.chat('user-1', {
      message: 'Which card should I use at Swiggy for ₹800?',
    });

    expect(recommendations.recommendBestCard).toHaveBeenCalled();
    expect(result.toolsUsed).toContain('getRecommendation');
    expect(result.message.length).toBeGreaterThan(0);
    expect(result.readOnly).toBe(true);
  });

  it('loads persisted conversation messages with flattened metadata', async () => {
    prisma.assistantConversation.findFirst = vi.fn().mockResolvedValue({
      id: CONVERSATION_ID,
      messages: [
        { role: 'user', content: 'Which card has 0% forex?', metadata: null },
        {
          role: 'assistant',
          content: 'IDFC FIRST Private offers 0% forex markup.',
          metadata: {
            confidence: 'high',
            toolsUsed: ['rag'],
            results: [
              {
                kind: 'card',
                id: CARD_ID,
                slug: 'idfc-first-private',
                title: 'IDFC FIRST Private',
              },
            ],
          },
        },
      ],
    });

    const conversation = await service.getConversation('user-1');

    expect(conversation?.conversationId).toBe(CONVERSATION_ID);
    expect(conversation?.messages).toHaveLength(2);
    const assistantMessage = conversation?.messages[1];
    expect(assistantMessage?.role).toBe('assistant');
    if (assistantMessage?.role === 'assistant') {
      expect(assistantMessage.results?.[0]?.title).toContain('IDFC FIRST Private');
    }
  });

  it('rejects unknown conversation ids', async () => {
    prisma.assistantConversation.findFirst = vi.fn().mockResolvedValue(null);

    await expect(
      service.chat('user-1', {
        message: 'hello',
        conversationId: '019f52a4-c692-727d-b386-e925a3c8ae99',
      }),
    ).rejects.toThrow(/conversation not found/i);
  });

  it('returns missing-context hint for purchase questions without merchant', async () => {
    classifyAssistantIntent.mockResolvedValue({
      data: { intent: 'recommendation', amount: 800 },
    });
    generateAssistantTurn.mockRejectedValue(new Error('offline'));

    const result = await service.chat('user-1', {
      message: 'Which card should I use for ₹800?',
    });

    expect(result.toolsUsed).toContain('getRecommendation');
    expect(result.message).toMatch(/merchant or category/i);
  });

  it('formats catalog forex responses with structured result cards', async () => {
    const result = await service.chat('user-1', { message: 'Which card has 0% forex?' });

    expect(result.message).toContain('forex');
    expect(result.results.length).toBeGreaterThan(0);
  });
});
