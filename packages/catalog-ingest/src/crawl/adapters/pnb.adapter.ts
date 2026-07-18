import { INDIA_BANK_SOURCES } from '../../india/bank-sources';
import type { BankCrawlerAdapter } from '../adapter';
import { createIssuerBankAdapter } from '../issuer-bank-adapter';

const BANK_SLUG = 'pnb';

const bankSource = INDIA_BANK_SOURCES.find((bank) => bank.slug === BANK_SLUG);
if (!bankSource) {
  throw new Error(`Missing INDIA_BANK_SOURCES entry for bank slug: ${BANK_SLUG}`);
}

/** Punjab National Bank — issuer adapter with bank-tuned discovery + fee/MITC extraction. */
export const pnbAdapter: BankCrawlerAdapter = createIssuerBankAdapter(bankSource, {
  productPathHints: ['credit-card', 'Credit-Cards'],
});
