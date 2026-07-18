import { afterEach, describe, expect, it, vi } from 'vitest';

import { INDIA_BANK_SOURCES } from '../../india/bank-sources';
import { getBankCrawlerAdapter, listRegisteredBankCrawlerAdapters } from './registry';
import { buildCatalogListingFixtureHtml, buildProductPageFixtureHtml } from './__fixtures__/card-fixtures';

function mockFetchOnce(handler: (url: string) => { html: string; finalUrl?: string; ok?: boolean }) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL) => {
      const url = String(input);
      const { html, finalUrl = url, ok = true } = handler(url);
      return {
        ok,
        status: ok ? 200 : 404,
        url: finalUrl,
        text: async () => html,
      } as unknown as Response;
    }),
  );
}

describe('BankCrawlerAdapter registry', () => {
  it('registers exactly one adapter per INDIA_BANK_SOURCES entry', () => {
    const adapters = listRegisteredBankCrawlerAdapters();
    expect(adapters).toHaveLength(INDIA_BANK_SOURCES.length);
  });

  for (const bank of INDIA_BANK_SOURCES) {
    it(`registers an adapter for "${bank.slug}" matching the BankCrawlerAdapter interface`, () => {
      const adapter = getBankCrawlerAdapter(bank.slug);
      expect(adapter.bankSlug).toBe(bank.slug);
      expect(adapter.catalogUrl).toBe(bank.catalogUrl);
      expect(typeof adapter.baseUrl).toBe('string');
      expect(adapter.baseUrl.length).toBeGreaterThan(0);
      expect(typeof adapter.discoverCardUrls).toBe('function');
      expect(typeof adapter.parseProductPage).toBe('function');
      expect(typeof adapter.extractSourceDocuments).toBe('function');
    });
  }

  it('throws for an unregistered bank slug', () => {
    expect(() => getBankCrawlerAdapter('not-a-real-bank')).toThrow();
  });
});

describe('discoverCardUrls', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  for (const bank of INDIA_BANK_SOURCES.filter((entry) => entry.slug !== 'idfc-first')) {
    it(`discovers product URLs for "${bank.slug}" from a generic catalog listing fixture`, async () => {
      const fixtureHtml = buildCatalogListingFixtureHtml(bank.catalogUrl, ['sample-card']);
      mockFetchOnce(() => ({ html: fixtureHtml, finalUrl: bank.catalogUrl }));

      const adapter = getBankCrawlerAdapter(bank.slug);
      const urls = await adapter.discoverCardUrls();

      expect(Array.isArray(urls)).toBe(true);
      expect(urls.length).toBeGreaterThan(0);
      expect(urls.some((url) => url.includes('sample-card'))).toBe(true);
    });
  }

  it('discovers product URLs for "idfc-first" from catalog + sitemap fixtures', async () => {
    const catalogHtml = '<a href="/credit-card/sample-first-card">Sample First Card</a>';
    mockFetchOnce((url) => {
      if (url.includes('sitemap.xml')) return { html: '', ok: false };
      return { html: catalogHtml };
    });

    const adapter = getBankCrawlerAdapter('idfc-first');
    const urls = await adapter.discoverCardUrls();

    expect(urls).toContain('https://www.idfcfirst.bank.in/credit-card/sample-first-card');
  });
});

describe('parseProductPage', () => {
  for (const bank of INDIA_BANK_SOURCES) {
    it(`parses a fixture product page for "${bank.slug}" into a card bundle`, async () => {
      const adapter = getBankCrawlerAdapter(bank.slug);
      const sourceUrl = `${bank.catalogUrl.replace(/\/+$/, '')}/sample-card`;
      const html = buildProductPageFixtureHtml({ name: `${bank.name} Sample Rewards Card` });

      const bundle = await adapter.parseProductPage({ sourceUrl, html });

      expect(bundle).not.toBeNull();
      expect(bundle?.bankSlug).toBe(bank.slug);
      expect(bundle?.slug.length).toBeGreaterThan(0);
      expect(bundle?.name).toContain('Sample Rewards Card');
      expect(Array.isArray(bundle?.highlights)).toBe(true);
    });
  }

  it('returns null for unparseable HTML', async () => {
    const adapter = getBankCrawlerAdapter('hdfc');
    const bundle = await adapter.parseProductPage({
      sourceUrl: 'https://www.hdfc.bank.in/credit-cards/not-a-card',
      html: '<!doctype html><html><body><p>Nothing here</p></body></html>',
    });
    expect(bundle).toBeNull();
  });
});

describe('extractSourceDocuments', () => {
  for (const bank of INDIA_BANK_SOURCES) {
    it(`extracts MITC/PDF document links for "${bank.slug}"`, () => {
      const adapter = getBankCrawlerAdapter(bank.slug);
      const sourceUrl = `${bank.catalogUrl.replace(/\/+$/, '')}/sample-card`;
      const html = buildProductPageFixtureHtml({
        name: `${bank.name} Sample Rewards Card`,
        mitcPath: '/documents/mitc-sample.pdf',
      });

      const documents = adapter.extractSourceDocuments({ sourceUrl, html });

      expect(Array.isArray(documents)).toBe(true);
      expect(documents.length).toBeGreaterThan(0);
      expect(documents.some((doc) => doc.kind === 'MITC')).toBe(true);
      expect(documents.some((doc) => doc.kind === 'SCHEDULE_OF_CHARGES')).toBe(true);
      for (const doc of documents) {
        expect(() => new URL(doc.url)).not.toThrow();
        expect(doc.label).toBeTruthy();
      }
    });
  }
});
