/** Third-party aggregator catalog listing pages (India). Enrichment + discovery only. */
export type AggregatorSource = {
  slug: string;
  name: string;
  catalogUrl: string;
  baseUrl: string;
};

export const INDIA_AGGREGATOR_SOURCES: AggregatorSource[] = [
  {
    slug: 'cardinsider',
    name: 'CardInsider',
    catalogUrl: 'https://cardinsider.com/credit-cards/',
    baseUrl: 'https://cardinsider.com',
  },
  {
    slug: 'paisabazaar',
    name: 'Paisabazaar',
    catalogUrl: 'https://www.paisabazaar.com/credit-card/',
    baseUrl: 'https://www.paisabazaar.com',
  },
];

export function aggregatorCatalogUrl(slug: string): string {
  const source = INDIA_AGGREGATOR_SOURCES.find((row) => row.slug === slug);
  if (!source) throw new Error(`Unknown aggregator slug: ${slug}`);
  return source.catalogUrl;
}
