import { INDIA_BANK_SOURCES } from '../../india/bank-sources';
import type { BankCrawlerAdapter } from '../adapter';
import { createIssuerBankAdapter } from '../issuer-bank-adapter';

const BANK_SLUG = 'axis';

const bankSource = INDIA_BANK_SOURCES.find((bank) => bank.slug === BANK_SLUG);
if (!bankSource) {
  throw new Error(`Missing INDIA_BANK_SOURCES entry for bank slug: ${BANK_SLUG}`);
}

/** Axis Bank — issuer adapter with bank-tuned discovery + fee/MITC extraction. */
export const axisAdapter: BankCrawlerAdapter = createIssuerBankAdapter(bankSource, {
  productPathHints: ['credit-card', 'credit-cards'],
});
