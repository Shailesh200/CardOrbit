import { describe, expect, it } from 'vitest';

import {
  absoluteUrl,
  buildJsonLdGraph,
  buildSitemapXml,
  injectSeoIntoHtml,
  seoForPath,
} from './seo';

describe('seo', () => {
  it('resolves public route definitions', () => {
    expect(seoForPath('/').title).toBe('CardOrbit: Which Credit Card to Use in India');
    expect(seoForPath('/').description.toLowerCase()).toContain('india');
    expect(seoForPath('/privacy').title).toContain('Privacy');
    expect(seoForPath('/terms').noindex).toBeFalsy();
  });

  it('marks app routes as noindex', () => {
    expect(seoForPath('/login').noindex).toBe(true);
    expect(seoForPath('/account/cards').noindex).toBe(true);
  });

  it('builds absolute landing URLs', () => {
    expect(absoluteUrl('/')).toBe('https://cardorbit.in/');
    expect(absoluteUrl('/privacy')).toBe('https://cardorbit.in/privacy');
  });

  it('builds sitemap with landing legal pages', () => {
    const xml = buildSitemapXml();
    expect(xml).toContain('https://cardorbit.in/');
    expect(xml).toContain('https://cardorbit.in/privacy');
    expect(xml).toContain('https://app.cardorbit.in/signup');
  });

  it('builds JSON-LD graph with Organization + WebSite', () => {
    const graph = buildJsonLdGraph(seoForPath('/'));
    expect(JSON.stringify(graph)).toContain('Organization');
    expect(JSON.stringify(graph)).toContain('WebSite');
    expect(JSON.stringify(graph)).toContain('SoftwareApplication');
  });

  it('injects route title and canonical into HTML', () => {
    const html = `<!doctype html><html><head>
      <title>Old</title>
      <meta name="description" content="old" />
      <link rel="canonical" href="https://cardorbit.in/" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://cardorbit.in/" />
      <meta property="og:title" content="Old" />
      <meta property="og:description" content="old" />
      <meta name="twitter:title" content="Old" />
      <meta name="twitter:description" content="old" />
      <script type="application/ld+json">{}</script>
    </head><body></body></html>`;
    const next = injectSeoIntoHtml(html, seoForPath('/privacy'));
    expect(next).toContain('<title>Privacy Policy · CardOrbit</title>');
    expect(next).toContain('href="https://cardorbit.in/privacy"');
    expect(next).toContain('Privacy Policy');
  });
});
