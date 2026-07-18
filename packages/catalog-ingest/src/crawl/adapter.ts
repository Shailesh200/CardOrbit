import type { IngestCardBundle, IngestSourceDocument } from '@cardwise/validation';

export type ProductPageInput = {
  /** Absolute URL of the fetched product page. */
  sourceUrl: string;
  /** Raw HTML of the fetched product page. */
  html: string;
};

/**
 * Per-bank deep crawler adapter contract.
 *
 * Every bank in `INDIA_BANK_SOURCES` must have exactly one adapter registered in
 * `crawl/adapters/registry.ts`. `idfc-first` implements this with a dedicated, hand-tuned
 * parser (see `crawl/adapters/idfc-first.adapter.ts`); every other bank is backed by the
 * hardened generic discovery + JSON-LD/HTML fallback parser (`crawl/adapters/generic.ts`)
 * until a bank-specific deep implementation is written.
 */
export interface BankCrawlerAdapter {
  readonly bankSlug: string;
  readonly bankName: string;
  readonly baseUrl: string;
  readonly catalogUrl: string;

  /** Discover absolute product page URLs from the bank's official catalog listing. */
  discoverCardUrls(): Promise<string[]>;

  /** Parse a fetched product page into a stageable card bundle, or `null` if unparseable. */
  parseProductPage(input: ProductPageInput): IngestCardBundle | null | Promise<IngestCardBundle | null>;

  /** Extract links to MITC / T&C / schedule-of-charges PDFs referenced on the product page. */
  extractSourceDocuments(input: ProductPageInput): IngestSourceDocument[];
}
