/** Minimal fixture builders shared by adapter interface tests — no live network calls. */

export function buildProductPageFixtureHtml(input: {
  name: string;
  description?: string;
  mitcPath?: string;
}): string {
  const description = input.description ?? 'A sample rewards credit card used for adapter fixture tests.';
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CreditCard',
    name: input.name,
    description,
    feesAndCommissionsSpecification: 'Annual fee ₹499 + GST, waived on annual spend of ₹1,00,000',
    hasOfferCatalog: {
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: { name: '5X Reward Points', description: 'On dining and travel spends' },
        },
      ],
    },
  };

  const mitcLink = input.mitcPath
    ? `<a href="${input.mitcPath}">Most Important Terms and Conditions (MITC)</a>`
    : '';

  return `<!doctype html>
<html>
  <head>
    <title>${input.name} | Apply Online</title>
    <meta name="description" content="${description}" />
    <script type="application/ld+json">${JSON.stringify(schema)}</script>
  </head>
  <body>
    <h1>${input.name}</h1>
    <a href="/documents/schedule-of-charges.pdf">Schedule of charges</a>
    ${mitcLink}
  </body>
</html>`;
}

export function buildCatalogListingFixtureHtml(catalogUrl: string, productSlugs: string[]): string {
  const catalogPath = new URL(catalogUrl).pathname.replace(/\/+$/, '');
  const links = productSlugs
    .map((slug) => `<a href="${catalogPath}/${slug}">${slug.replace(/-/g, ' ')}</a>`)
    .join('\n    ');

  return `<!doctype html>
<html>
  <body>
    <main>
      ${links}
    </main>
  </body>
</html>`;
}
