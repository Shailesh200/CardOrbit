export type SchemaOffer = {
  '@type'?: string;
  itemOffered?: {
    name?: string;
    description?: string;
  };
};

export type SchemaCreditCard = {
  '@type'?: string;
  name?: string;
  description?: string;
  url?: string;
  feesAndCommissionsSpecification?: unknown;
  hasOfferCatalog?: {
    itemListElement?: SchemaOffer[];
  };
};

const CREDIT_CARD_TYPES = new Set(['CreditCard', 'PaymentCard', 'FinancialProduct']);

export function extractJsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = [];
  const pattern = /<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/gi;
  for (const match of html.matchAll(pattern)) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    try {
      blocks.push(JSON.parse(raw));
    } catch {
      // ignore malformed blocks
    }
  }
  return blocks;
}

function flattenNodes(node: unknown): unknown[] {
  if (Array.isArray(node)) return node.flatMap(flattenNodes);
  if (node && typeof node === 'object' && '@graph' in node) {
    const graph = (node as Record<string, unknown>)['@graph'];
    return flattenNodes(graph);
  }
  return node ? [node] : [];
}

export function findBestCreditCardSchema(blocks: unknown[]): SchemaCreditCard | null {
  const nodes = blocks.flatMap(flattenNodes).filter((node) => node && typeof node === 'object') as SchemaCreditCard[];

  const ranked = nodes
    .filter((node) => node['@type'] && CREDIT_CARD_TYPES.has(String(node['@type'])))
    .sort((a, b) => scoreSchema(b) - scoreSchema(a));

  return ranked[0] ?? null;
}

function scoreSchema(node: SchemaCreditCard): number {
  let score = 0;
  if (node['@type'] === 'CreditCard') score += 4;
  if (node['@type'] === 'PaymentCard') score += 3;
  if (node.hasOfferCatalog?.itemListElement?.length) score += 5;
  if (node.feesAndCommissionsSpecification) score += 2;
  if (node.url) score += 1;
  if (node.description) score += 1;
  return score;
}

export function collectOffers(schema: SchemaCreditCard): Array<{ name: string; description: string }> {
  const offers = schema.hasOfferCatalog?.itemListElement ?? [];
  const seen = new Set<string>();
  const result: Array<{ name: string; description: string }> = [];

  for (const offer of offers) {
    const name = offer.itemOffered?.name?.trim();
    const description = offer.itemOffered?.description?.trim();
    if (!name) continue;
    const key = `${name}::${description ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ name, description: description ?? '' });
  }

  return result;
}

export function formatFeesSummary(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>;
          const chunks = [
            typeof record.name === 'string' ? record.name : null,
            record.price != null ? `₹${record.price}` : null,
            typeof record.description === 'string' ? record.description : null,
          ].filter(Boolean);
          return chunks.join(' — ');
        }
        return String(item);
      })
      .filter(Boolean);
    return parts.length ? parts.join(' | ') : null;
  }
  return String(value);
}

export function parseHtmlFallback(html: string): { name: string; description: string } | null {
  const titleRaw = html.match(/<title>([^<]+)/i)?.[1];
  const descriptionRaw =
    html.match(/<meta name="description" content="([^"]+)"/i)?.[1] ??
    html.match(/<meta property="og:description" content="([^"]+)"/i)?.[1];

  const decode = (value: string) =>
    value
      .replace(/&amp;/g, '&')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

  const title = titleRaw
    ? decode(titleRaw)
        .replace(/^Apply for (the )?/i, '')
        .replace(/\s+Online$/i, '')
        .replace(/\s*-\s*Get .*$/i, '')
        .replace(/\s*\|\s*HDFC Bank.*$/i, '')
        .replace(/\s*\|\s*ICICI Bank.*$/i, '')
        .replace(/\s*\|\s*Axis Bank.*$/i, '')
        .replace(/\s*-\s*Apply.*$/i, '')
        .split('|')[0]
        ?.trim() ?? ''
    : '';
  const description = descriptionRaw ? decode(descriptionRaw) : '';

  if (title.length < 5) return null;
  return { name: title, description };
}
