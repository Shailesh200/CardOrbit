import type { BankCrawlerAdapter, ProductPageInput } from '../adapter';
import {
  IDFC_FIRST_BANK_SLUG,
  IDFC_FIRST_BASE_URL,
  IDFC_FIRST_CATALOG_URL,
  crawlIdfcFirstCard,
  discoverIdfcFirstCardPaths,
} from '../idfc-first';
import { extractSourceDocumentLinks } from '../source-documents';

/**
 * IDFC FIRST Bank is the reference *deep* crawler: `idfc-first.ts` + `idfc-html.ts` do
 * dedicated heading/fee/eligibility extraction rather than relying on generic JSON-LD only.
 * This adapter is a thin wrapper so IDFC FIRST participates in the shared registry alongside
 * the generic-scaffolded banks.
 */
export const idfcFirstAdapter: BankCrawlerAdapter = {
  bankSlug: IDFC_FIRST_BANK_SLUG,
  bankName: 'IDFC FIRST Bank',
  baseUrl: IDFC_FIRST_BASE_URL,
  catalogUrl: IDFC_FIRST_CATALOG_URL,

  async discoverCardUrls() {
    const paths = await discoverIdfcFirstCardPaths();
    return paths.map((path) => `${IDFC_FIRST_BASE_URL}${path}`);
  },

  async parseProductPage(input: ProductPageInput) {
    const path = new URL(input.sourceUrl).pathname;
    const result = await crawlIdfcFirstCard(path, input.html);
    return result?.bundle ?? null;
  },

  extractSourceDocuments(input: ProductPageInput) {
    return extractSourceDocumentLinks(input.html, input.sourceUrl);
  },
};
