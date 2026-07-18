import { INDIA_BANK_SOURCES } from '../../india/bank-sources';
import type { BankCrawlerAdapter } from '../adapter';
import { auAdapter } from './au.adapter';
import { axisAdapter } from './axis.adapter';
import { bobAdapter } from './bob.adapter';
import { citiAdapter } from './citi.adapter';
import { hdfcAdapter } from './hdfc.adapter';
import { hsbcAdapter } from './hsbc.adapter';
import { iciciAdapter } from './icici.adapter';
import { idfcFirstAdapter } from './idfc-first.adapter';
import { indusindAdapter } from './indusind.adapter';
import { kotakAdapter } from './kotak.adapter';
import { pnbAdapter } from './pnb.adapter';
import { rblAdapter } from './rbl.adapter';
import { sbiAdapter } from './sbi.adapter';
import { standardCharteredAdapter } from './standard-chartered.adapter';
import { yesBankAdapter } from './yes-bank.adapter';

/**
 * Explicit registry of every `BankCrawlerAdapter`, one entry per bank in
 * `INDIA_BANK_SOURCES`. Adding a new bank to `bank-sources.ts` without adding + registering
 * a matching adapter module here fails fast at import time (see the invariant check below)
 * rather than silently falling back to nothing.
 */
export const BANK_CRAWLER_ADAPTERS: Readonly<Record<string, BankCrawlerAdapter>> = {
  [idfcFirstAdapter.bankSlug]: idfcFirstAdapter,
  [hdfcAdapter.bankSlug]: hdfcAdapter,
  [iciciAdapter.bankSlug]: iciciAdapter,
  [sbiAdapter.bankSlug]: sbiAdapter,
  [axisAdapter.bankSlug]: axisAdapter,
  [kotakAdapter.bankSlug]: kotakAdapter,
  [yesBankAdapter.bankSlug]: yesBankAdapter,
  [indusindAdapter.bankSlug]: indusindAdapter,
  [bobAdapter.bankSlug]: bobAdapter,
  [pnbAdapter.bankSlug]: pnbAdapter,
  [standardCharteredAdapter.bankSlug]: standardCharteredAdapter,
  [citiAdapter.bankSlug]: citiAdapter,
  [rblAdapter.bankSlug]: rblAdapter,
  [auAdapter.bankSlug]: auAdapter,
  [hsbcAdapter.bankSlug]: hsbcAdapter,
};

const unregisteredBankSlugs = INDIA_BANK_SOURCES.map((bank) => bank.slug).filter(
  (slug) => !BANK_CRAWLER_ADAPTERS[slug],
);
if (unregisteredBankSlugs.length > 0) {
  throw new Error(
    `Missing BankCrawlerAdapter registration in crawl/adapters/registry.ts for: ${unregisteredBankSlugs.join(', ')}`,
  );
}

export function getBankCrawlerAdapter(bankSlug: string): BankCrawlerAdapter {
  const adapter = BANK_CRAWLER_ADAPTERS[bankSlug];
  if (!adapter) {
    throw new Error(`No BankCrawlerAdapter registered for bank slug: ${bankSlug}`);
  }
  return adapter;
}

export function listRegisteredBankCrawlerAdapters(): BankCrawlerAdapter[] {
  return Object.values(BANK_CRAWLER_ADAPTERS);
}
