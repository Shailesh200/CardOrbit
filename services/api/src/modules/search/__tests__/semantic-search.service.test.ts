import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FeatureFlag } from '@cardwise/feature-flags';

import { AiService } from '../../ai/ai.service';
import { EmbeddingsService } from '../embeddings.service';
import { SemanticSearchService } from '../semantic-search.service';

const embedText = vi.fn();

vi.mock('@cardwise/ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cardwise/ai')>();
  return {
    ...actual,
    embedText: (...args: unknown[]) => embedText(...args),
    isAiConfigured: () => true,
    loadAiConfig: () => ({
      provider: 'gemini',
      apiKey: 'test',
      defaultModel: 'gemini-flash-latest',
      fastModel: 'gemini-flash-latest',
      qualityModel: 'gemini-flash-latest',
      pingModel: 'gemini-flash-latest',
      embeddingModel: 'text-embedding-004',
    }),
  };
});

describe('SemanticSearchService', () => {
  const prisma = {
    user: { findUnique: vi.fn() },
    creditCard: { findMany: vi.fn() },
    merchant: { findMany: vi.fn() },
    userCard: { findMany: vi.fn() },
    $queryRaw: vi.fn(),
    $queryRawUnsafe: vi.fn(),
  };

  const ai = {
    isFeatureEnabled: vi.fn(),
  } as unknown as AiService;

  const embeddings = {
    isSemanticSearchAvailable: vi.fn(),
    upsertQueryEmbedding: vi.fn(),
    entityTypesToDb: vi.fn((types: string[]) =>
      types.map((type) => (type === 'card' ? 'CARD' : 'MERCHANT')),
    ),
    getIndexStats: vi.fn(),
  } as unknown as EmbeddingsService;

  const service = new SemanticSearchService(prisma as never, ai, embeddings);

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.user.findUnique = vi.fn().mockResolvedValue({ id: 'user-1', accountStatus: 'ACTIVE' });
    prisma.userCard.findMany = vi.fn().mockResolvedValue([]);
    prisma.creditCard.findMany = vi.fn().mockResolvedValue([]);
    prisma.merchant.findMany = vi.fn().mockResolvedValue([
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Swiggy',
        slug: 'swiggy',
        paymentMethods: ['CARD'],
        popularityScore: 10,
        tags: [],
        primaryCategory: { id: 'c1', name: 'Food Delivery', slug: 'food-delivery' },
      },
    ]);
    ai.isFeatureEnabled = vi.fn().mockResolvedValue(true);
    embeddings.isSemanticSearchAvailable = vi.fn().mockResolvedValue(true);
    embeddings.upsertQueryEmbedding = vi.fn().mockResolvedValue([0.1, 0.2, 0.3]);
  });

  it('returns semantic results when index is ready', async () => {
    prisma.$queryRawUnsafe = vi.fn().mockResolvedValue([
      {
        entity_type: 'MERCHANT',
        entity_id: '11111111-1111-1111-1111-111111111111',
        slug: 'swiggy',
        name: 'Swiggy',
        subtitle: 'Food Delivery',
        score: 0.91,
      },
    ]);

    const result = await service.search('user-1', { q: 'food delivery app' });

    expect(result.source).toBe('semantic');
    expect(result.merchants).toHaveLength(1);
    expect(result.merchants?.[0]?.slug).toBe('swiggy');
    expect(embeddings.upsertQueryEmbedding).toHaveBeenCalledWith('food delivery app');
  });

  it('falls back to keyword search when semantic path is unavailable', async () => {
    embeddings.isSemanticSearchAvailable = vi.fn().mockResolvedValue(false);
    prisma.$queryRaw = vi.fn().mockResolvedValue([
      {
        id: '11111111-1111-1111-1111-111111111111',
        slug: 'swiggy',
        name: 'Swiggy',
        subtitle: 'Food Delivery',
      },
    ]);
    prisma.creditCard.findMany = vi.fn().mockResolvedValue([]);

    const result = await service.search('user-1', { q: 'swiggy', types: 'merchant' });

    expect(result.source).toBe('keyword');
    expect(result.items[0]?.slug).toBe('swiggy');
    expect(embeddings.upsertQueryEmbedding).not.toHaveBeenCalled();
  });

  it('reports readiness from flag, config, and index stats', async () => {
    embeddings.getIndexStats = vi.fn().mockResolvedValue({
      model: 'text-embedding-004',
      cards: 10,
      merchants: 20,
      total: 30,
    });
    ai.isFeatureEnabled = vi.fn().mockImplementation(async (flag: string) => {
      return flag === FeatureFlag.AI_SEARCH_ENABLED;
    });

    const status = await service.getStatus('user-1');

    expect(status.enabled).toBe(true);
    expect(status.ready).toBe(true);
    expect(status.indexed.total).toBe(30);
  });

  it('returns semantic card results and hydrates catalog cards', async () => {
    prisma.$queryRawUnsafe = vi.fn().mockResolvedValue([
      {
        entity_type: 'CARD',
        entity_id: '22222222-2222-2222-2222-222222222222',
        slug: 'idfc-first-private',
        name: 'IDFC FIRST Private',
        subtitle: 'IDFC FIRST Bank',
        score: 0.93,
      },
    ]);
    prisma.creditCard.findMany = vi.fn().mockResolvedValue([
      {
        id: '22222222-2222-2222-2222-222222222222',
        slug: 'idfc-first-private',
        name: 'IDFC FIRST Private',
        bank: { name: 'IDFC FIRST Bank' },
        network: { id: 'net-1', code: 'VISA', name: 'Visa' },
        _count: { benefits: { count: 4 } },
      },
    ]);

    const result = await service.search('user-1', { q: 'forex markup card', types: 'card' });

    expect(result.source).toBe('semantic');
    expect(result.cards).toHaveLength(1);
    expect(result.cards?.[0]?.slug).toBe('idfc-first-private');
  });

  it('falls back to keyword search when semantic query throws', async () => {
    prisma.$queryRawUnsafe = vi.fn().mockRejectedValue(new Error('vector extension unavailable'));
    prisma.$queryRaw = vi.fn().mockResolvedValue([
      {
        id: '11111111-1111-1111-1111-111111111111',
        slug: 'swiggy',
        name: 'Swiggy',
        subtitle: 'Food Delivery',
      },
    ]);

    const result = await service.search('user-1', { q: 'swiggy', types: 'merchant' });

    expect(result.source).toBe('keyword');
    expect(result.items[0]?.slug).toBe('swiggy');
  });

  it('rejects search for inactive users', async () => {
    prisma.user.findUnique = vi.fn().mockResolvedValue({
      id: 'user-1',
      accountStatus: 'SUSPENDED',
    });

    await expect(service.search('user-1', { q: 'swiggy' })).rejects.toThrow(/not active/i);
  });

  it('uses keyword path when AI search flag is disabled during semantic lookup', async () => {
    ai.isFeatureEnabled = vi.fn().mockImplementation(async (flag: string) => {
      return flag !== FeatureFlag.AI_SEARCH_ENABLED;
    });
    prisma.$queryRaw = vi.fn().mockResolvedValue([
      {
        id: '11111111-1111-1111-1111-111111111111',
        slug: 'swiggy',
        name: 'Swiggy',
        subtitle: 'Food Delivery',
      },
    ]);

    const result = await service.search('user-1', { q: 'swiggy', types: 'merchant' });

    expect(result.source).toBe('keyword');
    expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
  });
});
