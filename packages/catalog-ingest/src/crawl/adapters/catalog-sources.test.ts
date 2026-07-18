import { describe, expect, it } from 'vitest';

import { INDIA_CATALOG_SOURCES } from '../../india/catalog-sources';
import {
  CATALOG_CRAWLER_ADAPTERS,
  getCatalogCrawlerAdapter,
  listRegisteredCatalogCrawlerAdapters,
} from './registry';

describe('multi-source catalog adapter registry', () => {
  it('registers every INDIA_CATALOG_SOURCES slug including aggregators', () => {
    const adapters = listRegisteredCatalogCrawlerAdapters();
    expect(adapters.length).toBe(INDIA_CATALOG_SOURCES.length);
    for (const source of INDIA_CATALOG_SOURCES) {
      const adapter = getCatalogCrawlerAdapter(source.slug);
      expect(adapter.bankSlug).toBe(source.slug);
      expect(adapter.catalogUrl).toBe(source.catalogUrl);
      expect(adapter.sourceKind ?? 'issuer').toBe(source.kind);
      expect(CATALOG_CRAWLER_ADAPTERS[source.slug]).toBeDefined();
    }
  });

  it('marks CardInsider and Paisabazaar as aggregator adapters', () => {
    expect(getCatalogCrawlerAdapter('cardinsider').sourceKind).toBe('aggregator');
    expect(getCatalogCrawlerAdapter('paisabazaar').sourceKind).toBe('aggregator');
  });
});
