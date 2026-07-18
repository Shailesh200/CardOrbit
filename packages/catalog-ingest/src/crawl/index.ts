import type { IngestCardBundle } from '@cardwise/validation';

import { INDIA_AGGREGATOR_SOURCES } from '../india/aggregator-sources';
import { INDIA_BANK_SOURCES } from '../india/bank-sources';
import { INDIA_CATALOG_SOURCES, getCatalogSource } from '../india/catalog-sources';
import { getCatalogCrawlerAdapter } from './adapters/registry';
import { fetchText } from './http';
import { crawlIdfcFirstBank } from './idfc-first';

export type CatalogIngestPayload = {
  entityType: 'CARD_BUNDLE';
  entityKey: string;
  sourceUrl: string;
  payload: IngestCardBundle;
  summary: string;
};

export const SUPPORTED_BANK_CRAWLERS = INDIA_BANK_SOURCES.map((bank) => bank.slug);
export const SUPPORTED_BANK_AI_INGEST = INDIA_BANK_SOURCES.map((bank) => bank.slug);
export const SUPPORTED_CATALOG_SOURCES = INDIA_CATALOG_SOURCES.map((source) => source.slug);
export const SUPPORTED_AGGREGATOR_SOURCES = INDIA_AGGREGATOR_SOURCES.map((source) => source.slug);

export type SupportedBankSlug = (typeof SUPPORTED_BANK_CRAWLERS)[number];
export type SupportedAiIngestBankSlug = (typeof SUPPORTED_BANK_AI_INGEST)[number];
export type SupportedCatalogSourceSlug = (typeof SUPPORTED_CATALOG_SOURCES)[number];

export function isSupportedAiIngestBankSlug(value: string): value is SupportedAiIngestBankSlug {
  return (SUPPORTED_BANK_AI_INGEST as readonly string[]).includes(value);
}

export function isSupportedBankSlug(value: string): value is SupportedBankSlug {
  return (SUPPORTED_BANK_CRAWLERS as readonly string[]).includes(value);
}

export function isSupportedCatalogSourceSlug(value: string): value is SupportedCatalogSourceSlug {
  return (SUPPORTED_CATALOG_SOURCES as readonly string[]).includes(value);
}

/** Discover product page URLs via the registered catalog adapter (issuer or aggregator). */
export async function discoverBankCardUrls(bankSlug: string): Promise<string[]> {
  const adapter = getCatalogCrawlerAdapter(bankSlug);
  return adapter.discoverCardUrls();
}

export async function discoverCatalogCardUrls(sourceSlug: string): Promise<string[]> {
  return discoverBankCardUrls(sourceSlug);
}

function summarizeBundle(bundle: IngestCardBundle, sourceUrl: string): string {
  return `${bundle.name} — ${bundle.highlights.length} highlights, ${bundle.structuredFees.length} fee rows · ${sourceUrl}`;
}

/**
 * Rule-based crawl for a catalog source (issuer bank or aggregator).
 */
export async function crawlBankCards(bankSlug: string): Promise<CatalogIngestPayload[]> {
  return crawlCatalogSource(bankSlug);
}

export async function crawlCatalogSource(sourceSlug: string): Promise<CatalogIngestPayload[]> {
  if (!isSupportedCatalogSourceSlug(sourceSlug)) {
    throw new Error(`Unsupported catalog source: ${sourceSlug}`);
  }

  if (sourceSlug === 'idfc-first') {
    const cards = await crawlIdfcFirstBank();
    return cards.map(({ bundle, sourceUrl }) => ({
      entityType: 'CARD_BUNDLE' as const,
      entityKey: bundle.slug,
      sourceUrl,
      payload: bundle,
      summary: summarizeBundle(bundle, sourceUrl),
    }));
  }

  const adapter = getCatalogCrawlerAdapter(sourceSlug);
  const sourceUrls = await adapter.discoverCardUrls();
  const payloadsBySlug = new Map<string, CatalogIngestPayload>();

  for (const sourceUrl of sourceUrls) {
    try {
      const html = await fetchText(sourceUrl);
      const bundle = await adapter.parseProductPage({ sourceUrl, html });
      if (!bundle) continue;
      payloadsBySlug.set(bundle.slug, {
        entityType: 'CARD_BUNDLE',
        entityKey: bundle.slug,
        sourceUrl,
        payload: bundle,
        summary: summarizeBundle(bundle, sourceUrl),
      });
    } catch {
      // Skip pages that fail to fetch or parse.
    }
  }

  return [...payloadsBySlug.values()].sort((a, b) => a.payload.name.localeCompare(b.payload.name));
}

export function catalogSourceKind(sourceSlug: string): 'issuer' | 'aggregator' {
  return getCatalogSource(sourceSlug)?.kind ?? 'issuer';
}

export {
  IDFC_FIRST_BANK_SLUG,
  IDFC_FIRST_BASE_URL,
  IDFC_FIRST_CATALOG_URL,
  crawlIdfcFirstBank,
  crawlIdfcFirstCard,
  discoverIdfcFirstCardPaths,
} from './idfc-first';

export { discoverGenericBankCardUrls, bankCatalogListingUrl } from './generic-discovery';
export { parseGenericCardPage } from './generic-card-page';
export { parseAggregatorCardPage, discoverAggregatorUrlsFromHtml } from './aggregator-parse';
export { createIssuerBankAdapter } from './issuer-bank-adapter';
export {
  normalizeCardName,
  normalizeSourceUrl,
  cardNameSimilarity,
  isLikelySameCard,
} from './identity';

export { fetchText, fetchHtml, fetchPdf, type FetchHtmlResult, type FetchPdfResult } from './http';
export { extractPdfText, fetchAndExtractPdfText } from './pdf';
export { extractSourceDocumentLinks, mergeSourceDocuments } from './source-documents';

export type { BankCrawlerAdapter, CatalogCrawlerAdapter, ProductPageInput } from './adapter';
export { createGenericBankAdapter } from './adapters/generic';
export {
  BANK_CRAWLER_ADAPTERS,
  CATALOG_CRAWLER_ADAPTERS,
  getBankCrawlerAdapter,
  getCatalogCrawlerAdapter,
  listRegisteredBankCrawlerAdapters,
  listRegisteredCatalogCrawlerAdapters,
} from './adapters/registry';
