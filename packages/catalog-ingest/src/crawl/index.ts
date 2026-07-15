import type { IngestCardBundle } from '@cardwise/validation';

import { INDIA_BANK_SOURCES } from '../india/bank-sources';
import { discoverGenericBankCardUrls, bankCatalogListingUrl } from './generic-discovery';
import { crawlIdfcFirstBank, discoverIdfcFirstCardPaths } from './idfc-first';

export type CatalogIngestPayload = {
  entityType: 'CARD_BUNDLE';
  entityKey: string;
  sourceUrl: string;
  payload: IngestCardBundle;
  summary: string;
};

export const SUPPORTED_BANK_CRAWLERS = ['idfc-first'] as const;
export const SUPPORTED_BANK_AI_INGEST = INDIA_BANK_SOURCES.map((bank) => bank.slug);
export type SupportedBankSlug = (typeof SUPPORTED_BANK_CRAWLERS)[number];
export type SupportedAiIngestBankSlug = (typeof SUPPORTED_BANK_AI_INGEST)[number];

export function isSupportedAiIngestBankSlug(value: string): value is SupportedAiIngestBankSlug {
  return (SUPPORTED_BANK_AI_INGEST as readonly string[]).includes(value);
}

export function isSupportedBankSlug(value: string): value is SupportedBankSlug {
  return (SUPPORTED_BANK_CRAWLERS as readonly string[]).includes(value);
}

export async function discoverBankCardUrls(bankSlug: SupportedAiIngestBankSlug): Promise<string[]> {
  switch (bankSlug) {
    case 'idfc-first': {
      const paths = await discoverIdfcFirstCardPaths();
      return paths.map((path) => `https://www.idfcfirst.bank.in${path}`);
    }
    default:
      return discoverGenericBankCardUrls(bankSlug);
  }
}

export async function crawlBankCards(bankSlug: SupportedBankSlug): Promise<CatalogIngestPayload[]> {
  switch (bankSlug) {
    case 'idfc-first': {
      const cards = await crawlIdfcFirstBank();
      return cards.map(({ bundle, sourceUrl }) => ({
        entityType: 'CARD_BUNDLE' as const,
        entityKey: bundle.slug,
        sourceUrl,
        payload: bundle,
        summary: `${bundle.name} — ${bundle.highlights.length} highlights, ${bundle.structuredFees.length} fee rows · ${sourceUrl}`,
      }));
    }
    default:
      throw new Error(`Unsupported bank slug: ${bankSlug satisfies never}`);
  }
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

export { fetchText, fetchHtml, type FetchHtmlResult } from './http';
