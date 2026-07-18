import type { IngestCardBundle, IngestSourceDocument } from '@cardwise/validation';

export type ProductPageInput = {
  /** Absolute URL of the fetched product page. */
  sourceUrl: string;
  /** Raw HTML of the fetched product page. */
  html: string;
};

/**
 * Catalog crawler adapter contract (issuer banks + aggregators).
 *
 * Every source in `INDIA_CATALOG_SOURCES` must register exactly one adapter in
 * `crawl/adapters/registry.ts`.
 */
export interface BankCrawlerAdapter {
  readonly bankSlug: string;
  readonly bankName: string;
  readonly baseUrl: string;
  readonly catalogUrl: string;
  /** Defaults to issuer when omitted (legacy bank adapters). */
  readonly sourceKind?: 'issuer' | 'aggregator';

  /** Discover absolute product page URLs from the source catalog listing. */
  discoverCardUrls(): Promise<string[]>;

  /** Parse a fetched product page into a stageable card bundle, or `null` if unparseable. */
  parseProductPage(input: ProductPageInput): IngestCardBundle | null | Promise<IngestCardBundle | null>;

  /** Extract links to MITC / T&C / schedule-of-charges PDFs referenced on the product page. */
  extractSourceDocuments(input: ProductPageInput): IngestSourceDocument[];
}

/** Alias — adapters cover issuers and aggregators. */
export type CatalogCrawlerAdapter = BankCrawlerAdapter;
