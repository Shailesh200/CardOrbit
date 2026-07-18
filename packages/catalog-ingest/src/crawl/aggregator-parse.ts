import type { IngestCardBundle } from '@cardwise/validation';

import { INDIA_BANK_SOURCES } from '../india/bank-sources';
import { extractSourceDocumentLinks } from './source-documents';

const BANK_ALIASES: Array<{ bankSlug: string; patterns: RegExp[] }> = INDIA_BANK_SOURCES.map(
  (bank) => ({
    bankSlug: bank.slug,
    patterns: [
      new RegExp(bank.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
      new RegExp(bank.slug.replace(/-/g, '[-\\s]?'), 'i'),
    ],
  }),
).concat([
  { bankSlug: 'hdfc', patterns: [/\bhdfc\b/i] },
  { bankSlug: 'icici', patterns: [/\bicici\b/i] },
  { bankSlug: 'sbi', patterns: [/\bsbi\b|\bstate bank\b/i] },
  { bankSlug: 'axis', patterns: [/\baxis\b/i] },
  { bankSlug: 'yes-bank', patterns: [/\byes\s*bank\b/i] },
  { bankSlug: 'idfc-first', patterns: [/\bidfc\b/i] },
  { bankSlug: 'standard-chartered', patterns: [/\bstandard\s*chartered\b|\bscb\b/i] },
]);

function inferBankSlug(haystack: string): string | null {
  for (const row of BANK_ALIASES) {
    if (row.patterns.some((pattern) => pattern.test(haystack))) return row.bankSlug;
  }
  return null;
}

function slugify(bankSlug: string, name: string): string {
  const segment = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  return `${bankSlug}-${segment || 'card'}`;
}

function cleanName(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/\|\s*.*$/, '')
    .replace(/Review.*$/i, '')
    .replace(/-?\s*Apply.*$/i, '')
    .trim();
}

function inferNetwork(text: string): IngestCardBundle['networkCode'] {
  const lower = text.toLowerCase();
  if (lower.includes('rupay')) return 'RUPAY';
  if (lower.includes('amex') || lower.includes('american express')) return 'AMEX';
  if (lower.includes('mastercard') || lower.includes('master card')) return 'MASTERCARD';
  return 'VISA';
}

function parseFee(label: RegExp, text: string): number | null {
  const match = text.match(
    new RegExp(`${label.source}[^₹\\d]{0,40}(?:₹|Rs\\.?|INR)\\s*([\\d,]+)`, 'i'),
  );
  if (match?.[1]) return Number(match[1].replace(/,/g, ''));
  if (new RegExp(`${label.source}[^.]{0,40}\\b(?:nil|free|waived|zero)\\b`, 'i').test(text)) {
    return 0;
  }
  return null;
}

function parseMultiplier(text: string): number | undefined {
  const match = text.match(/(\d+(?:\.\d+)?)\s*[x×]/i);
  if (!match?.[1]) return undefined;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function titleFromHtml(html: string): string | null {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (og?.[1]) return cleanName(og[1]);
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (title?.[1]) return cleanName(title[1]);
  const h1 = html.match(/<h1[^>]*>([^<]{3,120})<\/h1>/i);
  if (h1?.[1]) return cleanName(h1[1].replace(/<[^>]+>/g, ''));
  return null;
}

/**
 * Conservative aggregator product-page parser. Maps bank from page text; stages
 * enrichment candidates — rates must still pass grounding against this page corpus.
 */
export function parseAggregatorCardPage(input: {
  aggregatorSlug: string;
  sourceUrl: string;
  html: string;
}): IngestCardBundle | null {
  const name = titleFromHtml(input.html);
  if (!name || name.length < 3) return null;

  const haystack = `${name} ${input.sourceUrl} ${input.html.slice(0, 20_000)}`;
  const bankSlug = inferBankSlug(haystack);
  if (!bankSlug) return null;

  const textSlice = input.html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ');
  const annualFeeInr = parseFee(/annual(?:\s*\/\s*renewal)?\s*fee/, textSlice);
  const joiningFeeInr = parseFee(/joining(?:\s*\/\s*one.?time)?\s*fee/, textSlice);
  const multiplier = parseMultiplier(textSlice);
  const slug = slugify(bankSlug, name);

  const highlights: IngestCardBundle['highlights'] = [
    {
      category: 'REWARDS',
      title: 'Aggregator summary',
      description: `Structured from ${input.aggregatorSlug} product page (enrichment; issuer remains rate authority).`,
      sourceUrl: input.sourceUrl,
    },
  ];

  const rewardRules: IngestCardBundle['rewardRules'] = multiplier
    ? [
        {
          ruleKey: `${slug}-aggregator-base`,
          name: 'Base rewards (aggregator page)',
          spendCategoryCode: null,
          merchantSlug: null,
          payload: { rewardMultiplier: multiplier, exclusions: [] },
          validFrom: '2026-01-01',
          validUntil: null,
          sourceUrl: input.sourceUrl,
        },
      ]
    : [];

  return {
    bankSlug,
    bankSourceUrl: input.sourceUrl,
    name,
    slug,
    sourceUrl: input.sourceUrl,
    networkCode: inferNetwork(haystack),
    tier: 'STANDARD',
    annualFeeInr,
    joiningFeeInr,
    rewardProgramSlug: null,
    pointValueInr: null,
    tags: [`source:${input.aggregatorSlug}`],
    structuredFees: [],
    highlights,
    approvalSummary: null,
    eligibilitySummary: null,
    benefits: highlights.map((h) => ({
      benefitTypeCode: h.category,
      title: h.title,
      description: h.description ?? null,
      sourceUrl: h.sourceUrl ?? null,
    })),
    rewardRules,
    crawlDescription: `Aggregator source: ${input.aggregatorSlug}`,
    feesSummary: null,
    sourceDocuments: extractSourceDocumentLinks(input.html, input.sourceUrl),
  };
}

export function discoverAggregatorUrlsFromHtml(
  html: string,
  catalogUrl: string,
  options: { pathIncludes: string[]; max?: number },
): string[] {
  const base = new URL(catalogUrl);
  const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1]!);
  const found = new Set<string>();

  for (const raw of hrefs) {
    try {
      const absolute = new URL(raw, catalogUrl);
      if (absolute.hostname !== base.hostname && !absolute.hostname.endsWith(`.${base.hostname}`)) {
        continue;
      }
      const path = absolute.pathname.toLowerCase();
      if (!options.pathIncludes.some((hint) => path.includes(hint))) continue;
      if (/\.(pdf|jpg|png|css|js)$/i.test(path)) continue;
      if (/login|signup|apply-now-form|privacy|terms|about/i.test(path)) continue;
      absolute.hash = '';
      absolute.search = '';
      found.add(absolute.toString());
    } catch {
      // ignore bad hrefs
    }
  }

  return [...found].slice(0, options.max ?? 80);
}
