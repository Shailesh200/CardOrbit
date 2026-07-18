import type { BankSource } from '../india/bank-sources';
import type { BankCrawlerAdapter, ProductPageInput } from './adapter';
import { discoverGenericBankCardUrls } from './generic-discovery';
import { parseGenericCardPage } from './generic-card-page';
import { extractSourceDocumentLinks } from './source-documents';

export type IssuerBankAdapterOptions = {
  /** Extra path fragments that mark a product URL for this bank. */
  productPathHints?: string[];
  /** Domains allowed during discovery (defaults to catalog host). */
  allowedHosts?: string[];
};

/**
 * Deep-enough issuer adapter: bank-tuned discovery hints + improved generic parse
 * (separate joining/annual fee) + MITC link extraction. Used for all non-IDFC issuers.
 */
export function createIssuerBankAdapter(
  bank: BankSource,
  options: IssuerBankAdapterOptions = {},
): BankCrawlerAdapter {
  return {
    bankSlug: bank.slug,
    bankName: bank.name,
    baseUrl: new URL(bank.catalogUrl).origin,
    catalogUrl: bank.catalogUrl,
    sourceKind: 'issuer',

    async discoverCardUrls() {
      const urls = await discoverGenericBankCardUrls(bank.slug);
      const hints = options.productPathHints ?? [];
      if (hints.length === 0) return urls;
      const preferred = urls.filter((url) => {
        const lower = url.toLowerCase();
        return hints.some((hint) => lower.includes(hint.toLowerCase()));
      });
      return preferred.length > 0 ? preferred : urls;
    },

    parseProductPage(input: ProductPageInput) {
      return parseGenericCardPage({
        bankSlug: bank.slug,
        sourceUrl: input.sourceUrl,
        html: input.html,
        bankSourceUrl: bank.catalogUrl,
      });
    },

    extractSourceDocuments(input: ProductPageInput) {
      return extractSourceDocumentLinks(input.html, input.sourceUrl);
    },
  };
}
