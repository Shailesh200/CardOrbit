import { BadRequestException, Injectable } from '@nestjs/common';
import { generateRagAnswer, isAiConfigured } from '@cardwise/ai';
import { FeatureFlag } from '@cardwise/feature-flags';
import {
  catalogSearchTerms,
  type RagAnswerOutput,
  type RagAnswerResponse,
  type RagChunk,
  type RagCitation,
  type RagRetrievalRequest,
  type RagRetrievalResponse,
} from '@cardwise/validation';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { SemanticSearchService } from '../search/semantic-search.service';
import { ContextEngineService } from './context-engine.service';
import { KnowledgeGraphService } from '../knowledge-graph/knowledge-graph.service';

@Injectable()
export class RagService {
  constructor(
    private readonly ai: AiService,
    private readonly contextEngine: ContextEngineService,
    private readonly search: SemanticSearchService,
    private readonly prisma: PrismaService,
    private readonly knowledgeGraph: KnowledgeGraphService,
  ) {}

  private async assertRagEnabled(userId: string): Promise<void> {
    if (!(await this.ai.isFeatureEnabled(FeatureFlag.AI_ASSISTANT_ENABLED, userId))) {
      throw new BadRequestException('AI assistant / RAG is disabled (ai_assistant_enabled=false)');
    }
  }

  async retrieve(userId: string, request: RagRetrievalRequest): Promise<RagRetrievalResponse> {
    await this.assertRagEnabled(userId);

    const types = request.types ?? ['card', 'merchant'];
    const limit = request.limit ?? 8;
    const userContext = await this.contextEngine.buildUserContext(userId);

    const search = await this.search.search(userId, {
      q: request.q,
      types: types.join(','),
      limit,
      offset: 0,
    });

    const chunks = await this.buildChunks(search, types, request.q);
    const enriched = await this.knowledgeGraph.enrichRetrievalChunks(userId, chunks);

    return {
      query: request.q,
      source: search.source,
      userContext,
      chunks: enriched,
    };
  }

  async answer(userId: string, request: RagRetrievalRequest): Promise<RagAnswerResponse> {
    const retrieval = await this.retrieve(userId, request);

    if (!isAiConfigured() || retrieval.chunks.length === 0) {
      return {
        ...retrieval,
        answer: {
          answer:
            retrieval.chunks.length === 0
              ? 'I could not find relevant catalog information for that question yet. Try rephrasing or run the embeddings backfill job.'
              : 'AI is not configured — enable GEMINI_API_KEY to generate grounded answers.',
          citations: [],
          confidence: 'low',
        },
      };
    }

    try {
      const result = await generateRagAnswer({
        question: request.q,
        userContext: retrieval.userContext,
        chunks: retrieval.chunks.map((chunk) => ({
          title: chunk.title,
          excerpt: chunk.excerpt,
          slug: chunk.slug,
          entityType: chunk.entityType,
          citation: chunk.citation,
        })),
      });

      return {
        ...retrieval,
        answer: this.normalizeGeneratedAnswer(result.data, retrieval.chunks),
      };
    } catch {
      return {
        ...retrieval,
        answer: this.buildBenefitFallbackAnswer(request.q, retrieval.chunks),
      };
    }
  }

  private normalizeGeneratedAnswer(answer: RagAnswerOutput, chunks: RagChunk[]): RagAnswerOutput {
    const bySlug = new Map(chunks.map((chunk) => [chunk.slug, chunk.citation]));
    const citations: RagCitation[] = [];

    for (const citation of answer.citations) {
      const known = bySlug.get(citation.slug);
      if (known) citations.push(known);
    }

    if (citations.length === 0) {
      citations.push(...chunks.slice(0, 3).map((chunk) => chunk.citation));
    }

    return { ...answer, citations };
  }

  private buildBenefitFallbackAnswer(question: string, chunks: RagChunk[]): RagAnswerOutput {
    const cardChunks = chunks.filter((chunk) => chunk.entityType === 'card');
    const terms = catalogSearchTerms(question);

    const ranked = cardChunks
      .map((chunk) => ({
        chunk,
        score: terms.filter((term) => chunk.excerpt.toLowerCase().includes(term)).length,
      }))
      .sort((a, b) => b.score - a.score);

    const relevant = ranked.filter((row) => row.score > 0).map((row) => row.chunk);
    const picked = (relevant.length > 0 ? relevant : ranked.map((row) => row.chunk)).slice(0, 4);

    if (picked.length === 0) {
      return {
        answer:
          'I could not find relevant catalog information for that question yet. Try rephrasing or run the embeddings backfill job.',
        citations: [],
        confidence: 'low',
      };
    }

    const isForexQuestion = /\bforex\b|\bmarkup\b|\binternational\b/i.test(question);
    const intro = isForexQuestion
      ? 'These catalog cards have forex-related benefits worth comparing:'
      : 'These catalog cards look most relevant to your question:';

    const summary = picked
      .map((chunk) => `${chunk.title} — ${this.excerptHighlights(chunk.excerpt)}`)
      .join(' ');

    return {
      answer: `${intro} ${summary}`,
      citations: picked.slice(0, 3).map((chunk) => chunk.citation),
      confidence: relevant.length > 0 ? 'medium' : 'low',
    };
  }

  private excerptHighlights(excerpt: string): string {
    const parts = excerpt.split(' · ');
    const benefits = parts.slice(2);
    if (benefits.length > 0) return benefits.join('; ');
    return parts.slice(1).join(' · ') || excerpt;
  }

  private async loadCardBenefits(
    cardIds: string[],
  ): Promise<Map<string, Array<{ title: string; description: string | null }>>> {
    if (cardIds.length === 0) return new Map();

    const rows = await this.prisma.cardBenefit.findMany({
      where: { creditCardId: { in: cardIds }, deletedAt: null },
      select: { creditCardId: true, title: true, description: true },
      orderBy: { title: 'asc' },
    });

    const map = new Map<string, Array<{ title: string; description: string | null }>>();
    for (const row of rows) {
      const list = map.get(row.creditCardId) ?? [];
      if (list.length < 12) {
        list.push({ title: row.title, description: row.description });
      }
      map.set(row.creditCardId, list);
    }

    return map;
  }

  private selectBenefitHighlights(
    benefits: Array<{ title: string; description: string | null }>,
    query: string,
  ): string[] {
    const terms = catalogSearchTerms(query);
    const ranked = benefits
      .map((benefit) => {
        const text = `${benefit.title}${benefit.description ? `: ${benefit.description}` : ''}`;
        const haystack = text.toLowerCase();
        const hits = terms.filter((term) => haystack.includes(term)).length;
        return { text, hits };
      })
      .sort((a, b) => b.hits - a.hits || a.text.localeCompare(b.text));

    const matched = ranked.filter((row) => row.hits > 0).map((row) => row.text);
    if (matched.length > 0) return matched.slice(0, 4);

    return ranked.slice(0, 3).map((row) => row.text);
  }

  private formatCardExcerpt(
    card: {
      bank: { name: string };
      network: { name: string };
      benefitCount: number;
      annualFeeInr?: string | null;
      joiningFeeInr?: string | null;
    },
    benefits: Array<{ title: string; description: string | null }>,
    query: string,
  ): string {
    const header = `${card.bank.name} · ${card.network.name}`;
    const feeBits: string[] = [];
    if (card.annualFeeInr != null) {
      const annual = Number(card.annualFeeInr);
      feeBits.push(
        Number.isFinite(annual) && annual === 0
          ? 'Lifetime free / ₹0 annual fee'
          : `Annual fee ₹${card.annualFeeInr}`,
      );
    }
    if (card.joiningFeeInr != null && card.joiningFeeInr !== card.annualFeeInr) {
      feeBits.push(`Joining fee ₹${card.joiningFeeInr}`);
    }
    const highlights = this.selectBenefitHighlights(benefits, query);
    if (highlights.length === 0) {
      if (feeBits.length > 0) return `${header} · ${feeBits.join(' · ')}`;
      if (card.benefitCount > 0) return `${header} · ${card.benefitCount} catalog benefits`;
      return `${header} · Fees and rewards still syncing from issuer sources`;
    }
    return `${header} · ${[...feeBits.slice(0, 1), ...highlights].join(' · ')}`;
  }

  private async buildChunks(
    search: Awaited<ReturnType<SemanticSearchService['search']>>,
    types: Array<'card' | 'merchant'>,
    query: string,
  ): Promise<RagChunk[]> {
    const chunks: RagChunk[] = [];
    const cardIds = types.includes('card') ? (search.cards?.map((card) => card.id) ?? []) : [];
    const benefitsByCard = await this.loadCardBenefits(cardIds);

    if (types.includes('card') && search.cards) {
      for (const card of search.cards) {
        const item = search.items.find((row) => row.entityType === 'card' && row.id === card.id);
        chunks.push({
          id: `card:${card.slug}`,
          entityType: 'card',
          slug: card.slug,
          title: card.name,
          excerpt: this.formatCardExcerpt(card, benefitsByCard.get(card.id) ?? [], query),
          score: item?.score ?? 0.5,
          citation: {
            entityType: 'card',
            id: card.id,
            slug: card.slug,
            label: card.name,
          },
        });
      }
    }

    if (types.includes('merchant') && search.merchants) {
      for (const merchant of search.merchants) {
        const item = search.items.find(
          (row) => row.entityType === 'merchant' && row.id === merchant.id,
        );
        chunks.push({
          id: `merchant:${merchant.slug}`,
          entityType: 'merchant',
          slug: merchant.slug,
          title: merchant.name,
          excerpt: merchant.category?.name ?? 'Merchant',
          score: item?.score ?? 0.5,
          citation: {
            entityType: 'merchant',
            id: merchant.id,
            slug: merchant.slug,
            label: merchant.name,
          },
        });
      }
    }

    return chunks.sort((a, b) => b.score - a.score);
  }
}
