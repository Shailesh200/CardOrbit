import type { BankSource } from '../../india/bank-sources';
import type { BankCrawlerAdapter, ProductPageInput } from '../adapter';
import { discoverGenericBankCardUrls } from '../generic-discovery';
import { parseGenericCardPage } from '../generic-card-page';
import { extractSourceDocumentLinks } from '../source-documents';

/**
 * Builds a hardened, bank-agnostic `BankCrawlerAdapter` from a `bank-sources.ts` entry.
 *
 * Used for every India bank that doesn't (yet) have a dedicated deep crawler: discovery
 * scans the official catalog listing for product-like links, and product pages are parsed
 * via JSON-LD `CreditCard`/`PaymentCard` schema with an HTML `<title>`/meta-description
 * fallback. This is intentionally conservative — it stages reviewable import candidates
 * rather than fully-detailed bundles.
 */
export function createGenericBankAdapter(bank: BankSource): BankCrawlerAdapter {
  return {
    bankSlug: bank.slug,
    bankName: bank.name,
    baseUrl: new URL(bank.catalogUrl).origin,
    catalogUrl: bank.catalogUrl,
    sourceKind: 'issuer',

    async discoverCardUrls() {
      return discoverGenericBankCardUrls(bank.slug);
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
