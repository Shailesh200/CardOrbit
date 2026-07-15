import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FeatureFlag } from '@cardwise/feature-flags';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { AiService } from '../../ai/ai.service';
import { KnowledgeGraphService } from '../knowledge-graph.service';

describe('KnowledgeGraphService', () => {
  const ai = { isFeatureEnabled: vi.fn() } as unknown as AiService;
  const prisma = {
    creditCard: { findFirst: vi.fn(), findMany: vi.fn() },
    merchant: { findFirst: vi.fn(), findMany: vi.fn() },
    bank: { findFirst: vi.fn() },
    offer: { findFirst: vi.fn() },
    merchantCategory: { findFirst: vi.fn() },
    cardNetwork: { findFirst: vi.fn() },
  } as unknown as PrismaService;

  const service = new KnowledgeGraphService(ai, prisma);

  beforeEach(() => {
    vi.clearAllMocks();
    ai.isFeatureEnabled = vi.fn().mockResolvedValue(true);
  });

  it('rejects traverse when knowledge graph flag is disabled', async () => {
    ai.isFeatureEnabled = vi.fn().mockImplementation(async (flag: string) => {
      return flag !== FeatureFlag.AI_KNOWLEDGE_GRAPH_ENABLED;
    });

    await expect(
      service.traverse('user-1', { entityType: 'card', slug: 'test-card', depth: 1, limit: 10 }),
    ).rejects.toThrow(/disabled/i);
  });

  it('traverses card neighbors including bank, benefits, and offers', async () => {
    prisma.creditCard.findFirst = vi
      .fn()
      .mockResolvedValueOnce({
        id: 'card-1',
        slug: 'idfc-first',
        name: 'IDFC FIRST Private',
        bank: { name: 'IDFC FIRST Bank' },
        network: { name: 'Visa' },
      })
      .mockResolvedValueOnce({
        id: 'card-1',
        slug: 'idfc-first',
        name: 'IDFC FIRST Private',
        bank: { id: 'bank-1', slug: 'idfc-first-bank', name: 'IDFC FIRST Bank' },
        network: { id: 'network-1', slug: 'visa', name: 'Visa' },
        benefits: [{ id: 'benefit-1', title: 'Forex markup', description: '0% forex markup' }],
        offerCardAssignments: [
          {
            offer: {
              id: 'offer-1',
              slug: 'swiggy-cashback',
              title: '10% Swiggy cashback',
              description: 'Up to ₹500',
              merchants: [
                {
                  merchant: {
                    id: 'merchant-1',
                    slug: 'swiggy',
                    name: 'Swiggy',
                    primaryCategory: { name: 'Food Delivery' },
                  },
                },
              ],
            },
          },
        ],
      });

    const result = await service.traverse('user-1', {
      entityType: 'card',
      slug: 'idfc-first',
      depth: 1,
      limit: 20,
    });

    expect(result.start.label).toBe('IDFC FIRST Private');
    expect(result.edges.some((edge) => edge.type === 'issued_by')).toBe(true);
    expect(result.edges.some((edge) => edge.type === 'has_benefit')).toBe(true);
    expect(result.edges.some((edge) => edge.type === 'valid_at_merchant')).toBe(true);
    expect(
      result.nodes.some((node) => node.entityType === 'merchant' && node.slug === 'swiggy'),
    ).toBe(true);
  });

  it('enriches retrieval chunks with related merchant graph nodes', async () => {
    prisma.creditCard.findFirst = vi.fn().mockResolvedValue({
      id: 'card-1',
      slug: 'idfc-first',
      name: 'IDFC FIRST Private',
      bank: { id: 'bank-1', slug: 'idfc-first-bank', name: 'IDFC FIRST Bank' },
      network: { id: 'network-1', slug: 'visa', name: 'Visa' },
      benefits: [],
      offerCardAssignments: [
        {
          offer: {
            id: 'offer-1',
            slug: 'swiggy-cashback',
            title: '10% Swiggy cashback',
            description: null,
            merchants: [
              {
                merchant: {
                  id: 'merchant-1',
                  slug: 'swiggy',
                  name: 'Swiggy',
                  primaryCategory: { name: 'Food Delivery' },
                },
              },
            ],
          },
        },
      ],
    });

    const chunks = [
      {
        id: 'card:idfc-first',
        entityType: 'card' as const,
        slug: 'idfc-first',
        title: 'IDFC FIRST Private',
        excerpt: 'IDFC FIRST Bank · Visa',
        score: 0.9,
        citation: {
          entityType: 'card' as const,
          id: 'card-1',
          slug: 'idfc-first',
          label: 'IDFC FIRST Private',
        },
      },
    ];

    const enriched = await service.enrichRetrievalChunks('user-1', chunks);

    expect(enriched.length).toBeGreaterThan(1);
    expect(enriched.some((chunk) => chunk.slug === 'swiggy')).toBe(true);
    expect(enriched.some((chunk) => chunk.excerpt.includes('Swiggy cashback'))).toBe(true);
  });

  it('returns chunks unchanged when graph flag is disabled', async () => {
    ai.isFeatureEnabled = vi.fn().mockResolvedValue(false);

    const chunks = [
      {
        id: 'card:test',
        entityType: 'card' as const,
        slug: 'test',
        title: 'Test Card',
        excerpt: 'Test',
        score: 0.5,
        citation: {
          entityType: 'card' as const,
          id: 'card-1',
          slug: 'test',
          label: 'Test Card',
        },
      },
    ];

    const result = await service.enrichRetrievalChunks('user-1', chunks);
    expect(result).toEqual(chunks);
  });
});
