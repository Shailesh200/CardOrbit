import type { IngestCardBundle } from '@cardwise/validation';

import { INDIA_BANK_SOURCES } from '../india/bank-sources';
import { getBankCrawlerAdapter } from './adapters/registry';
import { fetchText } from './http';
import { crawlIdfcFirstBank } from './idfc-first';

export type CatalogIngestPayload = {
  entityType: 'CARD_BUNDLE';
  entityKey: string;
  sourceUrl: string;
  payload: IngestCardBundle;
  summary: string;
};

/**
 * Deep crawler adapters exist for every India bank in `INDIA_BANK_SOURCES` (see
 * `crawl/adapters/registry.ts`): `idfc-first` uses a dedicated deep implementation, every
 * other bank uses the hardened generic discovery + product-page parser until a
 * bank-specific deep implementation is written.
 */
export const SUPPORTED_BANK_CRAWLERS = INDIA_BANK_SOURCES.map((bank) => bank.slug);
export const SUPPORTED_BANK_AI_INGEST = INDIA_BANK_SOURCES.map((bank) => bank.slug);
export type SupportedBankSlug = (typeof SUPPORTED_BANK_CRAWLERS)[number];
export type SupportedAiIngestBankSlug = (typeof SUPPORTED_BANK_AI_INGEST)[number];

export function isSupportedAiIngestBankSlug(value: string): value is SupportedAiIngestBankSlug {
  return (SUPPORTED_BANK_AI_INGEST as readonly string[]).includes(value);
}

export function isSupportedBankSlug(value: string): value is SupportedBankSlug {
  return (SUPPORTED_BANK_CRAWLERS as readonly string[]).includes(value);
}

/** Discover per-bank product page URLs via the registered `BankCrawlerAdapter`. */
export async function discoverBankCardUrls(bankSlug: SupportedAiIngestBankSlug): Promise<string[]> {
  const adapter = getBankCrawlerAdapter(bankSlug);
  return adapter.discoverCardUrls();
}

function summarizeBundle(bundle: IngestCardBundle, sourceUrl: string): string {
  return `${bundle.name} — ${bundle.highlights.length} highlights, ${bundle.structuredFees.length} fee rows · ${sourceUrl}`;
}

/**
 * Rule-based (non-AI) crawl for a bank's full card catalog, used by the admin "Crawl bank"
 * action. IDFC FIRST uses its dedicated deep crawler; every other bank crawls via its
 * registered generic `BankCrawlerAdapter` (discover → fetch → parseProductPage).
 */
export async function crawlBankCards(bankSlug: SupportedBankSlug): Promise<CatalogIngestPayload[]> {
  if (bankSlug === 'idfc-first') {
    const cards = await crawlIdfcFirstBank();
    return cards.map(({ bundle, sourceUrl }) => ({
      entityType: 'CARD_BUNDLE' as const,
      entityKey: bundle.slug,
      sourceUrl,
      payload: bundle,
      summary: summarizeBundle(bundle, sourceUrl),
    }));
  }

  const adapter = getBankCrawlerAdapter(bankSlug);
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

export { fetchText, fetchHtml, fetchPdf, type FetchHtmlResult, type FetchPdfResult } from './http';
export { extractPdfText, fetchAndExtractPdfText } from './pdf';
export { extractSourceDocumentLinks, mergeSourceDocuments } from './source-documents';

export type { BankCrawlerAdapter, ProductPageInput } from './adapter';
export { createGenericBankAdapter } from './adapters/generic';
export {
  BANK_CRAWLER_ADAPTERS,
  getBankCrawlerAdapter,
  listRegisteredBankCrawlerAdapters,
} from './adapters/registry';
