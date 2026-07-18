export {
  discoverGenericBankCardUrls,
  bankCatalogListingUrl,
} from './crawl/generic-discovery';
export type {
  CatalogIngestPayload,
  SupportedBankSlug,
  SupportedAiIngestBankSlug,
  SupportedCatalogSourceSlug,
  BankCrawlerAdapter,
  CatalogCrawlerAdapter,
  ProductPageInput,
} from './crawl';
export {
  SUPPORTED_BANK_CRAWLERS,
  SUPPORTED_BANK_AI_INGEST,
  SUPPORTED_CATALOG_SOURCES,
  SUPPORTED_AGGREGATOR_SOURCES,
  crawlBankCards,
  crawlCatalogSource,
  discoverBankCardUrls,
  discoverCatalogCardUrls,
  catalogSourceKind,
  fetchText,
  fetchHtml,
  fetchPdf,
  isSupportedBankSlug,
  isSupportedAiIngestBankSlug,
  isSupportedCatalogSourceSlug,
  crawlIdfcFirstBank,
  crawlIdfcFirstCard,
  discoverIdfcFirstCardPaths,
  parseGenericCardPage,
  parseAggregatorCardPage,
  discoverAggregatorUrlsFromHtml,
  createIssuerBankAdapter,
  extractPdfText,
  fetchAndExtractPdfText,
  extractSourceDocumentLinks,
  mergeSourceDocuments,
  createGenericBankAdapter,
  BANK_CRAWLER_ADAPTERS,
  CATALOG_CRAWLER_ADAPTERS,
  getBankCrawlerAdapter,
  getCatalogCrawlerAdapter,
  listRegisteredBankCrawlerAdapters,
  listRegisteredCatalogCrawlerAdapters,
  normalizeCardName,
  normalizeSourceUrl,
  cardNameSimilarity,
  isLikelySameCard,
  IDFC_FIRST_BANK_SLUG,
  IDFC_FIRST_BASE_URL,
  IDFC_FIRST_CATALOG_URL,
} from './crawl';

export { INDIA_BANK_SOURCES, bankCatalogUrl } from './india/bank-sources';
export type { BankSource } from './india/bank-sources';
export { INDIA_AGGREGATOR_SOURCES, aggregatorCatalogUrl } from './india/aggregator-sources';
export type { AggregatorSource } from './india/aggregator-sources';
export {
  INDIA_CATALOG_SOURCES,
  getCatalogSource,
  catalogSourceUrl,
  isIssuerSourceSlug,
  isAggregatorSourceSlug,
  toCatalogSourceFromBank,
  toCatalogSourceFromAggregator,
} from './india/catalog-sources';
export type { CatalogSource, CatalogSourceKind } from './india/catalog-sources';

export {
  groundIngestBundle,
  AUTO_PUBLISH_GROUNDING_SCORE,
} from './grounding/ground-bundle';
export type {
  BundleGroundingResult,
  GroundingClaim,
  GroundingIssueCode,
} from './grounding/ground-bundle';
