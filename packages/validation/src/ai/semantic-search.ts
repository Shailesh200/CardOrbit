import { z } from 'zod';

export const SEARCH_EMBEDDING_DIMENSION = 768;

export const SearchEntityTypeSchema = z.enum(['card', 'merchant']);
export type SearchEntityType = z.infer<typeof SearchEntityTypeSchema>;

export const AiSearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
  types: z.array(SearchEntityTypeSchema).min(1).max(2).optional(),
  limit: z.number().int().min(1).max(50).optional(),
  offset: z.number().int().min(0).optional(),
});

export type AiSearchQuery = z.infer<typeof AiSearchQuerySchema>;

export const AiSearchResultItemSchema = z.object({
  entityType: SearchEntityTypeSchema,
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  subtitle: z.string().nullable(),
  score: z.number().min(0).max(1),
});

export type AiSearchResultItem = z.infer<typeof AiSearchResultItemSchema>;

export const AiSearchResponseSchema = z.object({
  query: z.string(),
  source: z.enum(['semantic', 'keyword']),
  items: z.array(AiSearchResultItemSchema),
  total: z.number().int().nonnegative(),
  hasMore: z.boolean(),
  nextOffset: z.number().int().nonnegative().nullable(),
});

export type AiSearchResponse = z.infer<typeof AiSearchResponseSchema>;

export function hashSearchDocument(text: string): string {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${(hash >>> 0).toString(16)}:${text.length}`;
}

export function buildCardSearchDocument(input: {
  name: string;
  slug: string;
  bankName: string;
  networkName: string;
  tier: string;
  annualFeeInr?: string | null;
  benefits: Array<{ title: string; description?: string | null }>;
}): string {
  const lines = [
    `Credit card: ${input.name}`,
    `Slug: ${input.slug}`,
    `Bank: ${input.bankName}`,
    `Network: ${input.networkName}`,
    `Tier: ${input.tier}`,
  ];

  if (input.annualFeeInr) {
    lines.push(`Annual fee INR: ${input.annualFeeInr}`);
  }

  if (input.benefits.length > 0) {
    lines.push('Benefits:');
    for (const benefit of input.benefits.slice(0, 12)) {
      lines.push(`- ${benefit.title}${benefit.description ? `: ${benefit.description}` : ''}`);
    }
  }

  return lines.join('\n');
}

export function buildMerchantSearchDocument(input: {
  name: string;
  slug: string;
  categoryName?: string | null;
  brandName?: string | null;
  tags?: string[];
  aliases?: string[];
}): string {
  const lines = [`Merchant: ${input.name}`, `Slug: ${input.slug}`];

  if (input.categoryName) lines.push(`Category: ${input.categoryName}`);
  if (input.brandName) lines.push(`Brand: ${input.brandName}`);
  if (input.tags?.length) lines.push(`Tags: ${input.tags.join(', ')}`);
  if (input.aliases?.length) lines.push(`Also known as: ${input.aliases.join(', ')}`);

  return lines.join('\n');
}

/** Cosine similarity for unit-testable ranking helpers. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function formatVectorLiteral(values: number[]): string {
  return `[${values.map((value) => Number(value.toFixed(8))).join(',')}]`;
}

export function parseAiSearchQuery(raw: {
  q?: string;
  types?: string;
  limit?: number;
  offset?: number;
}): AiSearchQuery {
  const types =
    raw.types
      ?.split(',')
      .map((value) => value.trim())
      .filter(Boolean) ?? undefined;

  return AiSearchQuerySchema.parse({
    q: raw.q,
    types: types?.length ? types : undefined,
    limit: raw.limit,
    offset: raw.offset,
  });
}

const CATALOG_SEARCH_STOPWORDS = new Set(['card', 'cards', 'credit', 'the', 'and', 'for']);

/** Split a NL catalog query into terms that can match names, banks, and benefit text. */
export function catalogSearchTerms(query: string): string[] {
  const raw = query.match(/[\p{L}\p{N}]+(?:%|\p{L}\p{N}+)*|%/gu) ?? [];
  const terms = raw
    .map((term) => term.trim().toLowerCase())
    .filter((term) => term.length >= 2 && !CATALOG_SEARCH_STOPWORDS.has(term));

  return terms.length > 0 ? [...new Set(terms)] : [query.trim()].filter((term) => term.length >= 1);
}

export function buildCatalogCardKeywordWhere(query: string) {
  const terms = catalogSearchTerms(query);

  return {
    OR: terms.flatMap((term) => [
      { name: { contains: term, mode: 'insensitive' as const } },
      { bank: { name: { contains: term, mode: 'insensitive' as const } } },
      {
        benefits: {
          some: {
            deletedAt: null,
            OR: [
              { title: { contains: term, mode: 'insensitive' as const } },
              { description: { contains: term, mode: 'insensitive' as const } },
            ],
          },
        },
      },
    ]),
  };
}
