import { INDIA_BANK_SOURCES } from '../../india/bank-sources';
import type { BankCrawlerAdapter } from '../adapter';
import { createGenericBankAdapter } from './generic';

const BANK_SLUG = 'yes-bank';

const bankSource = INDIA_BANK_SOURCES.find((bank) => bank.slug === BANK_SLUG);
if (!bankSource) {
  throw new Error(`Missing INDIA_BANK_SOURCES entry for bank slug: ${BANK_SLUG}`);
}

/** Yes Bank — generic discovery + JSON-LD product page adapter (no dedicated deep crawler yet). */
export const yesBankAdapter: BankCrawlerAdapter = createGenericBankAdapter(bankSource);
