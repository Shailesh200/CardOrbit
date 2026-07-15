import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FeatureFlag } from '@cardwise/feature-flags';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { AiService } from '../../ai/ai.service';
import { SemanticSearchService } from '../../search/semantic-search.service';
import { ContextEngineService } from '../context-engine.service';
import { KnowledgeGraphService } from '../../knowledge-graph/knowledge-graph.service';
import { RagService } from '../rag.service';

const generateRagAnswer = vi.fn();

vi.mock('@cardwise/ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cardwise/ai')>();
  return {
    ...actual,
    generateRagAnswer: (...args: unknown[]) => generateRagAnswer(...args),
    isAiConfigured: () => true,
  };
});

describe('RagService', () => {
  const ai = { isFeatureEnabled: vi.fn() } as unknown as AiService;
  const contextEngine = {
    buildUserContext: vi.fn(),
  } as unknown as ContextEngineService;
  const search = {
    search: vi.fn(),
  } as unknown as SemanticSearchService;
  const prisma = {
    cardBenefit: {
      findMany: vi.fn(),
    },
  } as unknown as PrismaService;
  const knowledgeGraph = {
    enrichRetrievalChunks: vi.fn(),
  } as unknown as KnowledgeGraphService;

  const service = new RagService(ai, contextEngine, search, prisma, knowledgeGraph);

  const userContext = {
    preferredRewardType: 'cashback',
    preferredCategorySlugs: ['dining'],
    boostFavoriteCards: true,
    portfolioCount: 1,
    favoriteCount: 1,
    portfolioCards: [],
  };

  const cardSearchResult = {
    query: '0% forex card',
    source: 'semantic' as const,
    items: [
      { entityType: 'card' as const, id: 'card-1', slug: 'idfc-first-first-private', score: 0.9 },
    ],
    cards: [
      {
        id: 'card-1',
        slug: 'idfc-first-first-private',
        name: 'IDFC FIRST Private Credit Card',
        bank: { name: 'IDFC FIRST Bank' },
        network: { name: 'Visa' },
        benefitCount: 7,
      },
    ],
    total: 1,
    hasMore: false,
    nextOffset: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    ai.isFeatureEnabled = vi.fn().mockResolvedValue(true);
    contextEngine.buildUserContext = vi.fn().mockResolvedValue(userContext);
    search.search = vi.fn().mockResolvedValue(cardSearchResult);
    prisma.cardBenefit.findMany = vi.fn().mockResolvedValue([
      {
        creditCardId: 'card-1',
        title: 'Forex markup',
        description: '0% forex markup on international transactions',
      },
    ]);
    knowledgeGraph.enrichRetrievalChunks = vi
      .fn()
      .mockImplementation(async (_userId, chunks) => chunks);
  });

  it('returns retrieval chunks with benefit excerpts when assistant flag is enabled', async () => {
    const result = await service.retrieve('user-1', { q: '0% forex card', types: ['card'] });

    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0]?.slug).toBe('idfc-first-first-private');
    expect(result.chunks[0]?.excerpt).toContain('0% forex markup');
    expect(result.userContext).toEqual(userContext);
  });

  it('generates grounded answer from retrieval context', async () => {
    generateRagAnswer.mockResolvedValue({
      data: {
        answer: 'Your IDFC FIRST Private card has 0% forex markup on international spends.',
        citations: [
          {
            entityType: 'card',
            id: 'card-1',
            slug: 'idfc-first-first-private',
            label: 'IDFC FIRST Private Credit Card',
          },
        ],
        confidence: 'high',
      },
    });

    const result = await service.answer('user-1', { q: '0% forex card', types: ['card'] });

    expect(result.answer.confidence).toBe('high');
    expect(generateRagAnswer).toHaveBeenCalled();
    expect(generateRagAnswer.mock.calls[0]?.[0]?.chunks[0]?.excerpt).toContain('0% forex markup');
  });

  it('builds a benefit summary when answer generation fails', async () => {
    generateRagAnswer.mockRejectedValue(new Error('Gemini unavailable'));

    const result = await service.answer('user-1', { q: 'best forex benefits', types: ['card'] });

    expect(result.answer.answer).toContain('IDFC FIRST Private Credit Card');
    expect(result.answer.answer).toContain('0% forex markup');
    expect(result.answer.confidence).toBe('medium');
    expect(result.answer.citations[0]?.slug).toBe('idfc-first-first-private');
  });

  it('rejects when assistant flag is disabled', async () => {
    ai.isFeatureEnabled = vi.fn().mockImplementation(async (flag: string) => {
      return flag !== FeatureFlag.AI_ASSISTANT_ENABLED;
    });

    await expect(service.retrieve('user-1', { q: 'forex' })).rejects.toThrow(/disabled/i);
  });

  it('includes merchant retrieval chunks when search returns merchants', async () => {
    search.search = vi.fn().mockResolvedValue({
      query: 'swiggy',
      source: 'semantic' as const,
      items: [{ entityType: 'merchant' as const, id: 'merchant-1', slug: 'swiggy', score: 0.88 }],
      merchants: [
        {
          id: 'merchant-1',
          slug: 'swiggy',
          name: 'Swiggy',
          category: { name: 'Food Delivery' },
        },
      ],
      cards: [],
      total: 1,
      hasMore: false,
      nextOffset: null,
    });

    const result = await service.retrieve('user-1', { q: 'swiggy', types: ['merchant'] });

    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0]?.entityType).toBe('merchant');
    expect(result.chunks[0]?.title).toBe('Swiggy');
  });

  it('uses benefit count fallback when card has no matching benefit highlights', async () => {
    search.search = vi.fn().mockResolvedValue({
      query: 'lounge access',
      source: 'semantic' as const,
      items: [{ entityType: 'card' as const, id: 'card-2', slug: 'test-card', score: 0.7 }],
      cards: [
        {
          id: 'card-2',
          slug: 'test-card',
          name: 'Test Card',
          bank: { name: 'Test Bank' },
          network: { name: 'Visa' },
          benefitCount: 5,
        },
      ],
      total: 1,
      hasMore: false,
      nextOffset: null,
    });
    prisma.cardBenefit.findMany = vi.fn().mockResolvedValue([]);

    const result = await service.retrieve('user-1', { q: 'lounge access', types: ['card'] });

    expect(result.chunks[0]?.excerpt).toContain('5 benefits');
  });
});
