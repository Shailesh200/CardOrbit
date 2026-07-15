export {
  discoverGenericBankCardUrls,
  bankCatalogListingUrl,
} from './crawl/generic-discovery';
export type { CatalogIngestPayload, SupportedBankSlug, SupportedAiIngestBankSlug } from './crawl';
export {
  SUPPORTED_BANK_CRAWLERS,
  SUPPORTED_BANK_AI_INGEST,
  crawlBankCards,
  discoverBankCardUrls,
  fetchText,
  isSupportedBankSlug,
  isSupportedAiIngestBankSlug,
  crawlIdfcFirstBank,
  crawlIdfcFirstCard,
  discoverIdfcFirstCardPaths,
  parseGenericCardPage,
  IDFC_FIRST_BANK_SLUG,
  IDFC_FIRST_BASE_URL,
  IDFC_FIRST_CATALOG_URL,
} from './crawl';

export { INDIA_BANK_SOURCES, bankCatalogUrl } from './india/bank-sources';
export type { BankSource } from './india/bank-sources';
