import { INDIA_BANK_SOURCES, type BankSource } from './bank-sources';
import { INDIA_AGGREGATOR_SOURCES, type AggregatorSource } from './aggregator-sources';

export type CatalogSourceKind = 'issuer' | 'aggregator';

export type CatalogSource = {
  kind: CatalogSourceKind;
  slug: string;
  name: string;
  catalogUrl: string;
  /** Fields this source may authoritatively contribute. */
  trustTier: 'issuer_rates' | 'enrichment_only';
};

export function toCatalogSourceFromBank(bank: BankSource): CatalogSource {
  return {
    kind: 'issuer',
    slug: bank.slug,
    name: bank.name,
    catalogUrl: bank.catalogUrl,
    trustTier: 'issuer_rates',
  };
}

export function toCatalogSourceFromAggregator(source: AggregatorSource): CatalogSource {
  return {
    kind: 'aggregator',
    slug: source.slug,
    name: source.name,
    catalogUrl: source.catalogUrl,
    trustTier: 'enrichment_only',
  };
}

export const INDIA_CATALOG_SOURCES: CatalogSource[] = [
  ...INDIA_BANK_SOURCES.map(toCatalogSourceFromBank),
  ...INDIA_AGGREGATOR_SOURCES.map(toCatalogSourceFromAggregator),
];

export function getCatalogSource(slug: string): CatalogSource | undefined {
  return INDIA_CATALOG_SOURCES.find((row) => row.slug === slug);
}

export function catalogSourceUrl(slug: string): string {
  const source = getCatalogSource(slug);
  if (!source) throw new Error(`Unknown catalog source slug: ${slug}`);
  return source.catalogUrl;
}

export function isIssuerSourceSlug(slug: string): boolean {
  return INDIA_BANK_SOURCES.some((bank) => bank.slug === slug);
}

export function isAggregatorSourceSlug(slug: string): boolean {
  return INDIA_AGGREGATOR_SOURCES.some((source) => source.slug === slug);
}
