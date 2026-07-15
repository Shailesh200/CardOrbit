import { z } from 'zod';

export const GraphEntityTypeSchema = z.enum([
  'card',
  'merchant',
  'bank',
  'offer',
  'benefit',
  'category',
  'network',
]);

export type GraphEntityType = z.infer<typeof GraphEntityTypeSchema>;

export const GraphEdgeTypeSchema = z.enum([
  'issued_by',
  'on_network',
  'has_benefit',
  'has_offer',
  'valid_at_merchant',
  'in_category',
  'applies_to_card',
  'linked_to_card',
]);

export type GraphEdgeType = z.infer<typeof GraphEdgeTypeSchema>;

export const GraphEntityRefSchema = z.object({
  entityType: GraphEntityTypeSchema,
  id: z.string().uuid(),
  slug: z.string().min(1).max(160),
  label: z.string().min(1).max(240),
});

export type GraphEntityRef = z.infer<typeof GraphEntityRefSchema>;

export const GraphEdgeSchema = z.object({
  type: GraphEdgeTypeSchema,
  source: GraphEntityRefSchema,
  target: GraphEntityRefSchema,
  label: z.string().max(240).optional(),
});

export type GraphEdge = z.infer<typeof GraphEdgeSchema>;

export const GraphNodeSchema = GraphEntityRefSchema.extend({
  subtitle: z.string().max(240).optional(),
  highlights: z.array(z.string().max(500)).max(8).optional(),
});

export type GraphNode = z.infer<typeof GraphNodeSchema>;

export const GraphTraverseRequestSchema = z.object({
  entityType: GraphEntityTypeSchema,
  slug: z.string().trim().min(1).max(160),
  depth: z.number().int().min(1).max(2).default(1),
  limit: z.number().int().min(1).max(40).default(20),
});

export type GraphTraverseRequest = z.infer<typeof GraphTraverseRequestSchema>;

export const GraphTraverseResponseSchema = z.object({
  start: GraphNodeSchema,
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
  depth: z.number().int(),
});

export type GraphTraverseResponse = z.infer<typeof GraphTraverseResponseSchema>;

export const GraphExpandRequestSchema = z.object({
  entities: z.array(
    z.object({
      entityType: z.enum(['card', 'merchant']),
      id: z.string().uuid(),
    }),
  ),
  limit: z.number().int().min(1).max(20).default(12),
});

export type GraphExpandRequest = z.infer<typeof GraphExpandRequestSchema>;

export const GraphExpandResponseSchema = z.object({
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
});

export type GraphExpandResponse = z.infer<typeof GraphExpandResponseSchema>;

export function parseGraphTraverseRequest(input: unknown): GraphTraverseRequest {
  return GraphTraverseRequestSchema.parse(input);
}

export function parseGraphExpandRequest(input: unknown): GraphExpandRequest {
  return GraphExpandRequestSchema.parse(input);
}
