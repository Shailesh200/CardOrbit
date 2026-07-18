import { INDIA_AGGREGATOR_SOURCES } from '../../india/aggregator-sources';
import type { CatalogCrawlerAdapter, ProductPageInput } from '../adapter';
import {
  discoverAggregatorUrlsFromHtml,
  parseAggregatorCardPage,
} from '../aggregator-parse';
import { fetchHtml } from '../http';
import { extractSourceDocumentLinks } from '../source-documents';

const source = INDIA_AGGREGATOR_SOURCES.find((row) => row.slug === 'paisabazaar');
if (!source) throw new Error('Missing paisabazaar aggregator source');

export const paisabazaarAdapter: CatalogCrawlerAdapter = {
  bankSlug: source.slug,
  bankName: source.name,
  baseUrl: source.baseUrl,
  catalogUrl: source.catalogUrl,
  sourceKind: 'aggregator',

  async discoverCardUrls() {
    const { html } = await fetchHtml(source.catalogUrl);
    return discoverAggregatorUrlsFromHtml(html, source.catalogUrl, {
      pathIncludes: ['/credit-card/', '/credit-cards/'],
      max: 80,
    });
  },

  parseProductPage(input: ProductPageInput) {
    return parseAggregatorCardPage({
      aggregatorSlug: source.slug,
      sourceUrl: input.sourceUrl,
      html: input.html,
    });
  },

  extractSourceDocuments(input: ProductPageInput) {
    return extractSourceDocumentLinks(input.html, input.sourceUrl);
  },
};
