import { INDIA_AGGREGATOR_SOURCES } from '../../india/aggregator-sources';
import { INDIA_BANK_SOURCES } from '../../india/bank-sources';
import { INDIA_CATALOG_SOURCES } from '../../india/catalog-sources';
import type { CatalogCrawlerAdapter } from '../adapter';
import { auAdapter } from './au.adapter';
import { axisAdapter } from './axis.adapter';
import { bobAdapter } from './bob.adapter';
import { cardinsiderAdapter } from './cardinsider.adapter';
import { citiAdapter } from './citi.adapter';
import { hdfcAdapter } from './hdfc.adapter';
import { hsbcAdapter } from './hsbc.adapter';
import { iciciAdapter } from './icici.adapter';
import { idfcFirstAdapter } from './idfc-first.adapter';
import { indusindAdapter } from './indusind.adapter';
import { kotakAdapter } from './kotak.adapter';
import { paisabazaarAdapter } from './paisabazaar.adapter';
import { pnbAdapter } from './pnb.adapter';
import { rblAdapter } from './rbl.adapter';
import { sbiAdapter } from './sbi.adapter';
import { standardCharteredAdapter } from './standard-chartered.adapter';
import { yesBankAdapter } from './yes-bank.adapter';

/**
 * Explicit registry of every catalog crawler adapter (issuers + aggregators).
 */
export const CATALOG_CRAWLER_ADAPTERS: Readonly<Record<string, CatalogCrawlerAdapter>> = {
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
  [cardinsiderAdapter.bankSlug]: cardinsiderAdapter,
  [paisabazaarAdapter.bankSlug]: paisabazaarAdapter,
};

/** @deprecated Prefer CATALOG_CRAWLER_ADAPTERS — kept for bank-only call sites. */
export const BANK_CRAWLER_ADAPTERS: Readonly<Record<string, CatalogCrawlerAdapter>> =
  Object.fromEntries(
    INDIA_BANK_SOURCES.map((bank) => [bank.slug, CATALOG_CRAWLER_ADAPTERS[bank.slug]!]),
  );

const unregistered = INDIA_CATALOG_SOURCES.map((source) => source.slug).filter(
  (slug) => !CATALOG_CRAWLER_ADAPTERS[slug],
);
if (unregistered.length > 0) {
  throw new Error(
    `Missing CatalogCrawlerAdapter registration for: ${unregistered.join(', ')}`,
  );
}

const orphanAggregators = INDIA_AGGREGATOR_SOURCES.map((s) => s.slug).filter(
  (slug) => CATALOG_CRAWLER_ADAPTERS[slug]?.sourceKind !== 'aggregator',
);
if (orphanAggregators.length > 0) {
  throw new Error(`Aggregator adapters missing sourceKind=aggregator: ${orphanAggregators.join(', ')}`);
}

export function getCatalogCrawlerAdapter(sourceSlug: string): CatalogCrawlerAdapter {
  const adapter = CATALOG_CRAWLER_ADAPTERS[sourceSlug];
  if (!adapter) {
    throw new Error(`No CatalogCrawlerAdapter registered for source slug: ${sourceSlug}`);
  }
  return adapter;
}

export function getBankCrawlerAdapter(bankSlug: string): CatalogCrawlerAdapter {
  if (!INDIA_BANK_SOURCES.some((bank) => bank.slug === bankSlug)) {
    // Allow aggregator slugs through the same helper for job runners.
    return getCatalogCrawlerAdapter(bankSlug);
  }
  return getCatalogCrawlerAdapter(bankSlug);
}

export function listRegisteredBankCrawlerAdapters(): CatalogCrawlerAdapter[] {
  return INDIA_BANK_SOURCES.map((bank) => CATALOG_CRAWLER_ADAPTERS[bank.slug]!);
}

export function listRegisteredCatalogCrawlerAdapters(): CatalogCrawlerAdapter[] {
  return Object.values(CATALOG_CRAWLER_ADAPTERS);
}
