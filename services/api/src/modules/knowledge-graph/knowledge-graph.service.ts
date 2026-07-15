import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FeatureFlag } from '@cardwise/feature-flags';
import {
  type GraphEdge,
  type GraphEntityRef,
  type GraphEntityType,
  type GraphExpandRequest,
  type GraphExpandResponse,
  type GraphNode,
  type GraphTraverseRequest,
  type GraphTraverseResponse,
  type RagChunk,
} from '@cardwise/validation';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AiService } from '../ai/ai.service';

type NeighborBundle = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

@Injectable()
export class KnowledgeGraphService {
  constructor(
    private readonly ai: AiService,
    private readonly prisma: PrismaService,
  ) {}

  async isEnabled(userId: string): Promise<boolean> {
    return this.ai.isFeatureEnabled(FeatureFlag.AI_KNOWLEDGE_GRAPH_ENABLED, userId);
  }

  private async assertEnabled(userId: string): Promise<void> {
    if (!(await this.isEnabled(userId))) {
      throw new BadRequestException(
        'Knowledge graph is disabled (ai_knowledge_graph_enabled=false)',
      );
    }
  }

  async traverse(userId: string, request: GraphTraverseRequest): Promise<GraphTraverseResponse> {
    await this.assertEnabled(userId);

    const start = await this.resolveNode(request.entityType, request.slug);
    if (!start) {
      throw new NotFoundException(`Graph entity not found: ${request.entityType}/${request.slug}`);
    }

    const nodes = new Map<string, GraphNode>();
    const edges: GraphEdge[] = [];
    const seen = new Set<string>();

    const nodeKey = (ref: GraphEntityRef) => `${ref.entityType}:${ref.id}`;
    nodes.set(nodeKey(start), start);

    let frontier: GraphEntityRef[] = [start];
    for (let depth = 0; depth < request.depth; depth += 1) {
      const nextFrontier: GraphEntityRef[] = [];

      for (const ref of frontier) {
        const key = nodeKey(ref);
        if (seen.has(key)) continue;
        seen.add(key);

        const bundle = await this.loadNeighbors(ref);
        for (const edge of bundle.edges) {
          edges.push(edge);
          const target = edge.source.id === ref.id ? edge.target : edge.source;
          const targetKey = nodeKey(target);
          if (!nodes.has(targetKey)) {
            const neighborNode = bundle.nodes.find((node) => node.id === target.id);
            if (neighborNode) {
              nodes.set(targetKey, neighborNode);
              nextFrontier.push(neighborNode);
            }
          }
        }
      }

      frontier = nextFrontier.slice(0, request.limit);
      if (frontier.length === 0) break;
    }

    const allNodes = [...nodes.values()].slice(0, request.limit + 1);
    return {
      start,
      nodes: allNodes,
      edges: edges.slice(0, request.limit * 2),
      depth: request.depth,
    };
  }

  async expand(userId: string, request: GraphExpandRequest): Promise<GraphExpandResponse> {
    await this.assertEnabled(userId);

    const nodes = new Map<string, GraphNode>();
    const edges: GraphEdge[] = [];

    for (const entity of request.entities.slice(0, request.limit)) {
      const ref = await this.resolveRef(entity.entityType, entity.id);
      if (!ref) continue;

      const node = await this.resolveNode(entity.entityType, ref.slug);
      if (node) nodes.set(`${node.entityType}:${node.id}`, node);

      const bundle = await this.loadNeighbors(ref);
      for (const edge of bundle.edges) {
        edges.push(edge);
      }
      for (const neighbor of bundle.nodes) {
        nodes.set(`${neighbor.entityType}:${neighbor.id}`, neighbor);
      }
    }

    return {
      nodes: [...nodes.values()].slice(0, request.limit),
      edges: edges.slice(0, request.limit * 2),
    };
  }

  async enrichRetrievalChunks(userId: string, chunks: RagChunk[]): Promise<RagChunk[]> {
    if (!(await this.isEnabled(userId)) || chunks.length === 0) return chunks;

    const entities = chunks
      .filter((chunk) => chunk.entityType === 'card' || chunk.entityType === 'merchant')
      .map((chunk) => ({
        entityType: chunk.entityType,
        id: chunk.citation.id,
      }));

    if (entities.length === 0) return chunks;

    const expansion = await this.expandEntities(entities, 12);
    const extra = this.buildNeighborChunks(chunks, expansion);
    if (extra.length === 0) return chunks;

    return [...chunks, ...extra].sort((a, b) => b.score - a.score);
  }

  private async expandEntities(
    entities: Array<{ entityType: 'card' | 'merchant'; id: string }>,
    limit: number,
  ): Promise<GraphExpandResponse> {
    const nodes = new Map<string, GraphNode>();
    const edges: GraphEdge[] = [];

    for (const entity of entities) {
      const ref = await this.resolveRef(entity.entityType, entity.id);
      if (!ref) continue;

      const bundle = await this.loadNeighbors(ref);
      for (const edge of bundle.edges) edges.push(edge);
      for (const node of bundle.nodes) nodes.set(`${node.entityType}:${node.id}`, node);
    }

    return {
      nodes: [...nodes.values()].slice(0, limit),
      edges: edges.slice(0, limit * 2),
    };
  }

  private buildNeighborChunks(existing: RagChunk[], expansion: GraphExpandResponse): RagChunk[] {
    const knownIds = new Set(existing.map((chunk) => chunk.id));
    const extra: RagChunk[] = [];

    const offerLabels = new Map<string, string>();
    for (const node of expansion.nodes) {
      if (node.entityType === 'offer') {
        offerLabels.set(node.id, node.label);
      }
    }

    for (const node of expansion.nodes) {
      if (node.entityType !== 'merchant') continue;

      const chunkId = `merchant:${node.slug}`;
      if (knownIds.has(chunkId)) continue;

      const relatedOffers = expansion.edges
        .filter(
          (edge) =>
            edge.type === 'valid_at_merchant' &&
            (edge.source.id === node.id || edge.target.id === node.id),
        )
        .map((edge) => {
          const offerRef = edge.source.entityType === 'offer' ? edge.source : edge.target;
          return offerLabels.get(offerRef.id) ?? edge.label;
        })
        .filter((label): label is string => Boolean(label));

      const excerpt =
        relatedOffers.length > 0
          ? `${node.subtitle ?? 'Merchant'} · Offers: ${relatedOffers.slice(0, 3).join('; ')}`
          : (node.subtitle ?? 'Related merchant');

      extra.push({
        id: chunkId,
        entityType: 'merchant',
        slug: node.slug,
        title: node.label,
        excerpt,
        score: 0.35,
        citation: {
          entityType: 'merchant',
          id: node.id,
          slug: node.slug,
          label: node.label,
        },
      });
      knownIds.add(chunkId);
    }

    for (const node of expansion.nodes) {
      if (node.entityType !== 'offer') continue;

      const linkedMerchants = expansion.edges.filter(
        (edge) =>
          edge.type === 'valid_at_merchant' &&
          (edge.source.id === node.id || edge.target.id === node.id),
      );

      for (const edge of linkedMerchants) {
        const merchantRef = edge.source.entityType === 'merchant' ? edge.source : edge.target;
        const chunkId = `merchant:${merchantRef.slug}`;
        if (knownIds.has(chunkId)) continue;

        extra.push({
          id: chunkId,
          entityType: 'merchant',
          slug: merchantRef.slug,
          title: merchantRef.label,
          excerpt: `Offer: ${node.label}${node.subtitle ? ` · ${node.subtitle}` : ''}`,
          score: 0.32,
          citation: {
            entityType: 'merchant',
            id: merchantRef.id,
            slug: merchantRef.slug,
            label: merchantRef.label,
          },
        });
        knownIds.add(chunkId);
      }
    }

    return extra.slice(0, 6);
  }

  private async resolveRef(
    entityType: 'card' | 'merchant',
    id: string,
  ): Promise<GraphEntityRef | null> {
    if (entityType === 'card') {
      const card = await this.prisma.creditCard.findFirst({
        where: { id, deletedAt: null, active: true },
        select: { id: true, slug: true, name: true },
      });
      if (!card) return null;
      return { entityType: 'card', id: card.id, slug: card.slug, label: card.name };
    }

    const merchant = await this.prisma.merchant.findFirst({
      where: { id, deletedAt: null, active: true },
      select: { id: true, slug: true, name: true },
    });
    if (!merchant) return null;
    return {
      entityType: 'merchant',
      id: merchant.id,
      slug: merchant.slug,
      label: merchant.name,
    };
  }

  async getEntity(userId: string, entityType: GraphEntityType, slug: string): Promise<GraphNode> {
    await this.assertEnabled(userId);

    const node = await this.resolveNode(entityType, slug);
    if (!node) {
      throw new NotFoundException(`Graph entity not found: ${entityType}/${slug}`);
    }

    return node;
  }

  async resolveNode(entityType: GraphEntityType, slug: string): Promise<GraphNode | null> {
    switch (entityType) {
      case 'card':
        return this.resolveCardNode(slug);
      case 'merchant':
        return this.resolveMerchantNode(slug);
      case 'bank':
        return this.resolveBankNode(slug);
      case 'offer':
        return this.resolveOfferNode(slug);
      case 'category':
        return this.resolveCategoryNode(slug);
      case 'network':
        return this.resolveNetworkNode(slug);
      case 'benefit':
        return null;
      default:
        return null;
    }
  }

  private async resolveCardNode(slug: string): Promise<GraphNode | null> {
    const card = await this.prisma.creditCard.findFirst({
      where: { slug, deletedAt: null, active: true },
      select: {
        id: true,
        slug: true,
        name: true,
        bank: { select: { name: true } },
        network: { select: { name: true } },
      },
    });
    if (!card) return null;

    return {
      entityType: 'card',
      id: card.id,
      slug: card.slug,
      label: card.name,
      subtitle: `${card.bank.name} · ${card.network.name}`,
    };
  }

  private async resolveMerchantNode(slug: string): Promise<GraphNode | null> {
    const merchant = await this.prisma.merchant.findFirst({
      where: { slug, deletedAt: null, active: true },
      select: {
        id: true,
        slug: true,
        name: true,
        primaryCategory: { select: { name: true } },
      },
    });
    if (!merchant) return null;

    return {
      entityType: 'merchant',
      id: merchant.id,
      slug: merchant.slug,
      label: merchant.name,
      subtitle: merchant.primaryCategory?.name,
    };
  }

  private async resolveBankNode(slug: string): Promise<GraphNode | null> {
    const bank = await this.prisma.bank.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true, slug: true, name: true },
    });
    if (!bank) return null;

    return {
      entityType: 'bank',
      id: bank.id,
      slug: bank.slug,
      label: bank.name,
    };
  }

  private async resolveOfferNode(slug: string): Promise<GraphNode | null> {
    const offer = await this.prisma.offer.findFirst({
      where: { slug, deletedAt: null, status: 'ACTIVE' },
      select: { id: true, slug: true, title: true, description: true },
    });
    if (!offer) return null;

    return {
      entityType: 'offer',
      id: offer.id,
      slug: offer.slug,
      label: offer.title,
      subtitle: offer.description ?? undefined,
    };
  }

  private async resolveCategoryNode(slug: string): Promise<GraphNode | null> {
    const category = await this.prisma.merchantCategory.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true, slug: true, name: true },
    });
    if (!category) return null;

    return {
      entityType: 'category',
      id: category.id,
      slug: category.slug,
      label: category.name,
    };
  }

  private async resolveNetworkNode(slug: string): Promise<GraphNode | null> {
    const network = await this.prisma.cardNetwork.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true, slug: true, name: true },
    });
    if (!network) return null;

    return {
      entityType: 'network',
      id: network.id,
      slug: network.slug,
      label: network.name,
    };
  }

  private async loadNeighbors(ref: GraphEntityRef): Promise<NeighborBundle> {
    switch (ref.entityType) {
      case 'card':
        return this.loadCardNeighbors(ref);
      case 'merchant':
        return this.loadMerchantNeighbors(ref);
      case 'bank':
        return this.loadBankNeighbors(ref);
      case 'offer':
        return this.loadOfferNeighbors(ref);
      case 'category':
        return this.loadCategoryNeighbors(ref);
      case 'network':
        return this.loadNetworkNeighbors(ref);
      default:
        return { nodes: [], edges: [] };
    }
  }

  private async loadCardNeighbors(cardRef: GraphEntityRef): Promise<NeighborBundle> {
    const card = await this.prisma.creditCard.findFirst({
      where: { id: cardRef.id, deletedAt: null, active: true },
      include: {
        bank: { select: { id: true, slug: true, name: true } },
        network: { select: { id: true, slug: true, name: true } },
        benefits: {
          where: { deletedAt: null },
          select: { id: true, title: true, description: true },
          take: 8,
          orderBy: { title: 'asc' },
        },
        offerCardAssignments: {
          where: { deletedAt: null, offer: { deletedAt: null, status: 'ACTIVE' } },
          include: {
            offer: {
              include: {
                merchants: {
                  where: { deletedAt: null },
                  include: {
                    merchant: {
                      select: {
                        id: true,
                        slug: true,
                        name: true,
                        primaryCategory: { select: { name: true } },
                      },
                    },
                  },
                  take: 6,
                },
              },
            },
          },
          take: 8,
        },
      },
    });

    if (!card) return { nodes: [], edges: [] };

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    const bankRef: GraphEntityRef = {
      entityType: 'bank',
      id: card.bank.id,
      slug: card.bank.slug,
      label: card.bank.name,
    };
    nodes.push({ ...bankRef });
    edges.push({
      type: 'issued_by',
      source: cardRef,
      target: bankRef,
      label: 'Issued by',
    });

    const networkRef: GraphEntityRef = {
      entityType: 'network',
      id: card.network.id,
      slug: card.network.slug,
      label: card.network.name,
    };
    nodes.push({ ...networkRef, subtitle: 'Card network' });
    edges.push({
      type: 'on_network',
      source: cardRef,
      target: networkRef,
      label: 'Network',
    });

    for (const benefit of card.benefits) {
      const benefitRef: GraphEntityRef = {
        entityType: 'benefit',
        id: benefit.id,
        slug: benefit.id,
        label: benefit.title,
      };
      nodes.push({
        ...benefitRef,
        subtitle: benefit.description ?? undefined,
        highlights: benefit.description ? [benefit.description] : undefined,
      });
      edges.push({
        type: 'has_benefit',
        source: cardRef,
        target: benefitRef,
        label: benefit.title,
      });
    }

    for (const assignment of card.offerCardAssignments) {
      const offer = assignment.offer;
      const offerRef: GraphEntityRef = {
        entityType: 'offer',
        id: offer.id,
        slug: offer.slug,
        label: offer.title,
      };
      nodes.push({ ...offerRef, subtitle: offer.description ?? undefined });
      edges.push({
        type: 'has_offer',
        source: cardRef,
        target: offerRef,
        label: offer.title,
      });

      for (const offerMerchant of offer.merchants) {
        const merchant = offerMerchant.merchant;
        const merchantRef: GraphEntityRef = {
          entityType: 'merchant',
          id: merchant.id,
          slug: merchant.slug,
          label: merchant.name,
        };
        nodes.push({
          ...merchantRef,
          subtitle: merchant.primaryCategory?.name,
        });
        edges.push({
          type: 'valid_at_merchant',
          source: offerRef,
          target: merchantRef,
          label: offer.title,
        });
        edges.push({
          type: 'linked_to_card',
          source: cardRef,
          target: merchantRef,
          label: offer.title,
        });
      }
    }

    return { nodes, edges };
  }

  private async loadMerchantNeighbors(merchantRef: GraphEntityRef): Promise<NeighborBundle> {
    const merchant = await this.prisma.merchant.findFirst({
      where: { id: merchantRef.id, deletedAt: null, active: true },
      include: {
        primaryCategory: { select: { id: true, slug: true, name: true } },
        offerMerchants: {
          where: { deletedAt: null, offer: { deletedAt: null, status: 'ACTIVE' } },
          include: {
            offer: {
              include: {
                cardAssignments: {
                  where: { deletedAt: null },
                  include: {
                    creditCard: {
                      select: { id: true, slug: true, name: true },
                    },
                  },
                  take: 6,
                },
              },
            },
          },
          take: 10,
        },
      },
    });

    if (!merchant) return { nodes: [], edges: [] };

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    if (merchant.primaryCategory) {
      const categoryRef: GraphEntityRef = {
        entityType: 'category',
        id: merchant.primaryCategory.id,
        slug: merchant.primaryCategory.slug,
        label: merchant.primaryCategory.name,
      };
      nodes.push({ ...categoryRef });
      edges.push({
        type: 'in_category',
        source: merchantRef,
        target: categoryRef,
        label: merchant.primaryCategory.name,
      });
    }

    for (const offerMerchant of merchant.offerMerchants) {
      const offer = offerMerchant.offer;
      const offerRef: GraphEntityRef = {
        entityType: 'offer',
        id: offer.id,
        slug: offer.slug,
        label: offer.title,
      };
      nodes.push({ ...offerRef, subtitle: offer.description ?? undefined });
      edges.push({
        type: 'has_offer',
        source: merchantRef,
        target: offerRef,
        label: offer.title,
      });

      for (const assignment of offer.cardAssignments) {
        const card = assignment.creditCard;
        const cardRef: GraphEntityRef = {
          entityType: 'card',
          id: card.id,
          slug: card.slug,
          label: card.name,
        };
        nodes.push({ ...cardRef });
        edges.push({
          type: 'applies_to_card',
          source: offerRef,
          target: cardRef,
          label: offer.title,
        });
      }
    }

    return { nodes, edges };
  }

  private async loadBankNeighbors(bankRef: GraphEntityRef): Promise<NeighborBundle> {
    const cards = await this.prisma.creditCard.findMany({
      where: { bankId: bankRef.id, deletedAt: null, active: true },
      select: { id: true, slug: true, name: true },
      take: 12,
      orderBy: { name: 'asc' },
    });

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    for (const card of cards) {
      const cardRef: GraphEntityRef = {
        entityType: 'card',
        id: card.id,
        slug: card.slug,
        label: card.name,
      };
      nodes.push({ ...cardRef });
      edges.push({
        type: 'issued_by',
        source: cardRef,
        target: bankRef,
        label: 'Issued by',
      });
    }

    return { nodes, edges };
  }

  private async loadOfferNeighbors(offerRef: GraphEntityRef): Promise<NeighborBundle> {
    const offer = await this.prisma.offer.findFirst({
      where: { id: offerRef.id, deletedAt: null },
      include: {
        cardAssignments: {
          where: { deletedAt: null },
          include: {
            creditCard: { select: { id: true, slug: true, name: true } },
          },
        },
        merchants: {
          where: { deletedAt: null },
          include: {
            merchant: {
              select: { id: true, slug: true, name: true },
            },
          },
        },
      },
    });

    if (!offer) return { nodes: [], edges: [] };

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    for (const assignment of offer.cardAssignments) {
      const cardRef: GraphEntityRef = {
        entityType: 'card',
        id: assignment.creditCard.id,
        slug: assignment.creditCard.slug,
        label: assignment.creditCard.name,
      };
      nodes.push({ ...cardRef });
      edges.push({
        type: 'applies_to_card',
        source: offerRef,
        target: cardRef,
      });
    }

    for (const row of offer.merchants) {
      const merchantRef: GraphEntityRef = {
        entityType: 'merchant',
        id: row.merchant.id,
        slug: row.merchant.slug,
        label: row.merchant.name,
      };
      nodes.push({ ...merchantRef });
      edges.push({
        type: 'valid_at_merchant',
        source: offerRef,
        target: merchantRef,
      });
    }

    return { nodes, edges };
  }

  private async loadCategoryNeighbors(categoryRef: GraphEntityRef): Promise<NeighborBundle> {
    const merchants = await this.prisma.merchant.findMany({
      where: { primaryCategoryId: categoryRef.id, deletedAt: null, active: true },
      select: { id: true, slug: true, name: true },
      take: 12,
      orderBy: { popularityScore: 'desc' },
    });

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    for (const merchant of merchants) {
      const merchantRef: GraphEntityRef = {
        entityType: 'merchant',
        id: merchant.id,
        slug: merchant.slug,
        label: merchant.name,
      };
      nodes.push({ ...merchantRef });
      edges.push({
        type: 'in_category',
        source: merchantRef,
        target: categoryRef,
      });
    }

    return { nodes, edges };
  }

  private async loadNetworkNeighbors(networkRef: GraphEntityRef): Promise<NeighborBundle> {
    const cards = await this.prisma.creditCard.findMany({
      where: { networkId: networkRef.id, deletedAt: null, active: true },
      select: { id: true, slug: true, name: true },
      take: 12,
      orderBy: { name: 'asc' },
    });

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    for (const card of cards) {
      const cardRef: GraphEntityRef = {
        entityType: 'card',
        id: card.id,
        slug: card.slug,
        label: card.name,
      };
      nodes.push({ ...cardRef });
      edges.push({
        type: 'on_network',
        source: cardRef,
        target: networkRef,
      });
    }

    return { nodes, edges };
  }
}
