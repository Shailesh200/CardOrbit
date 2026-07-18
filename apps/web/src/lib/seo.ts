/** Central SEO definitions for public CardOrbit routes (landing host). */

export const LANDING_ORIGIN = 'https://cardorbit.in';
export const APP_ORIGIN = 'https://app.cardorbit.in';
export const SITE_NAME = 'CardOrbit';
export const DEFAULT_OG_IMAGE = `${LANDING_ORIGIN}/og-default.jpg`;

export type SeoDefinition = {
  path: string;
  title: string;
  description: string;
  /** When true, emit noindex (auth/app surfaces). */
  noindex?: boolean;
  ogType?: 'website' | 'article';
  /** Extra JSON-LD graph nodes beyond Organization + WebSite. */
  jsonLd?: Record<string, unknown>[];
};

const HOME_DESCRIPTION =
  'CardOrbit helps people in India choose the best credit card for every purchase — portfolio tracking, merchant recommendations, rewards, travel benefits, and optional Gmail spend-alert import.';

export const PUBLIC_SEO_ROUTES: SeoDefinition[] = [
  {
    path: '/',
    title: 'CardOrbit',
    description: HOME_DESCRIPTION,
    jsonLd: [
      {
        '@type': 'SoftwareApplication',
        name: SITE_NAME,
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Web',
        url: `${LANDING_ORIGIN}/`,
        description: HOME_DESCRIPTION,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
        image: DEFAULT_OG_IMAGE,
      },
    ],
  },
  {
    path: '/privacy',
    title: 'Privacy Policy · CardOrbit',
    description:
      'How CardOrbit collects, uses, and protects personal data — including portfolio information and optional Gmail spend-alert sync for users in India.',
    ogType: 'article',
    jsonLd: [
      {
        '@type': 'WebPage',
        name: 'Privacy Policy',
        url: `${LANDING_ORIGIN}/privacy`,
        isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: `${LANDING_ORIGIN}/` },
      },
    ],
  },
  {
    path: '/terms',
    title: 'Terms of Service · CardOrbit',
    description:
      'Terms of use for CardOrbit — informational credit-card recommendations, acceptable use, and disclaimers for users in India.',
    ogType: 'article',
    jsonLd: [
      {
        '@type': 'WebPage',
        name: 'Terms of Service',
        url: `${LANDING_ORIGIN}/terms`,
        isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: `${LANDING_ORIGIN}/` },
      },
    ],
  },
  {
    path: '/cookies',
    title: 'Cookie Policy · CardOrbit',
    description:
      'How CardOrbit uses cookies and similar technologies for authentication, preferences, and analytics.',
    ogType: 'article',
    jsonLd: [
      {
        '@type': 'WebPage',
        name: 'Cookie Policy',
        url: `${LANDING_ORIGIN}/cookies`,
        isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: `${LANDING_ORIGIN}/` },
      },
    ],
  },
];

/** Paths prerendered to static HTML for crawlers and social unfurlers. */
export const PRERENDER_PATHS = PUBLIC_SEO_ROUTES.map((route) => route.path);

const ACCOUNT_TITLE_PREFIX = 'CardOrbit · ';

export function seoForPath(pathname: string): SeoDefinition {
  const normalized = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
  const exact = PUBLIC_SEO_ROUTES.find((route) => route.path === normalized);
  if (exact) return exact;

  if (normalized.startsWith('/account') || normalized.startsWith('/onboarding')) {
    return {
      path: normalized,
      title: `${ACCOUNT_TITLE_PREFIX}Account`,
      description: HOME_DESCRIPTION,
      noindex: true,
    };
  }

  if (
    normalized === '/login' ||
    normalized === '/signup' ||
    normalized === '/verify-email' ||
    normalized === '/forgot-password' ||
    normalized === '/reset-password' ||
    normalized.startsWith('/oauth')
  ) {
    const labels: Record<string, string> = {
      '/login': 'Sign in',
      '/signup': 'Create account',
      '/verify-email': 'Verify email',
      '/forgot-password': 'Forgot password',
      '/reset-password': 'Reset password',
    };
    return {
      path: normalized,
      title: `${labels[normalized] ?? 'Account'} · CardOrbit`,
      description: HOME_DESCRIPTION,
      noindex: true,
    };
  }

  return {
    path: normalized || '/',
    title: 'CardOrbit',
    description: HOME_DESCRIPTION,
    noindex: normalized === '*' || normalized.includes('404'),
  };
}

export function absoluteUrl(path: string, origin = LANDING_ORIGIN): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (normalized === '/') return `${origin}/`;
  return `${origin}${normalized}`;
}

export function buildJsonLdGraph(seo: SeoDefinition): Record<string, unknown> {
  const pageUrl = absoluteUrl(seo.path);
  const graph: Record<string, unknown>[] = [
    {
      '@type': 'Organization',
      '@id': `${LANDING_ORIGIN}/#organization`,
      name: SITE_NAME,
      url: `${LANDING_ORIGIN}/`,
      logo: `${LANDING_ORIGIN}/favicon.svg`,
      sameAs: [],
    },
    {
      '@type': 'WebSite',
      '@id': `${LANDING_ORIGIN}/#website`,
      name: SITE_NAME,
      url: `${LANDING_ORIGIN}/`,
      publisher: { '@id': `${LANDING_ORIGIN}/#organization` },
      inLanguage: 'en-IN',
      potentialAction: {
        '@type': 'SearchAction',
        target: `${APP_ORIGIN}/account/merchants?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'WebPage',
      '@id': `${pageUrl}#webpage`,
      url: pageUrl,
      name: seo.title,
      description: seo.description,
      isPartOf: { '@id': `${LANDING_ORIGIN}/#website` },
      about: { '@id': `${LANDING_ORIGIN}/#organization` },
      inLanguage: 'en-IN',
    },
    ...(seo.jsonLd ?? []),
  ];

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}

export function buildSitemapXml(routes: SeoDefinition[] = PUBLIC_SEO_ROUTES): string {
  const urls = routes
    .filter((route) => !route.noindex)
    .map((route) => {
      const loc = absoluteUrl(route.path);
      const priority = route.path === '/' ? '1.0' : route.path === '/signup' ? '0.7' : '0.6';
      const changefreq = route.path === '/' ? 'weekly' : 'monthly';
      return `  <url>
    <loc>${loc}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
  <url>
    <loc>${APP_ORIGIN}/signup</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${APP_ORIGIN}/login</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>
`;
}

function upsertMeta(
  selector: string,
  attrs: Record<string, string>,
  content?: string,
): void {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
  if (!el) {
    const tag = attrs.rel ? 'link' : 'meta';
    el = document.createElement(tag) as HTMLMetaElement | HTMLLinkElement;
    document.head.appendChild(el);
  }
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value);
  }
  if (content != null && el instanceof HTMLMetaElement) {
    el.setAttribute('content', content);
  }
}

/** Apply SEO tags in the browser (SPA navigations). */
export function applyDocumentSeo(
  seo: SeoDefinition,
  options: { forceNoIndex?: boolean } = {},
): void {
  if (typeof document === 'undefined') return;

  const noindex = seo.noindex || options.forceNoIndex;
  const pageUrl = absoluteUrl(seo.path);
  const ogType = seo.ogType ?? 'website';

  document.title = seo.title;

  upsertMeta('meta[name="description"]', { name: 'description' }, seo.description);
  upsertMeta('meta[name="robots"]', { name: 'robots' }, noindex ? 'noindex,nofollow' : 'index,follow');
  upsertMeta('link[rel="canonical"]', { rel: 'canonical', href: pageUrl });

  upsertMeta('meta[property="og:type"]', { property: 'og:type' }, ogType);
  upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name' }, SITE_NAME);
  upsertMeta('meta[property="og:url"]', { property: 'og:url' }, pageUrl);
  upsertMeta('meta[property="og:title"]', { property: 'og:title' }, seo.title);
  upsertMeta('meta[property="og:description"]', { property: 'og:description' }, seo.description);
  upsertMeta('meta[property="og:image"]', { property: 'og:image' }, DEFAULT_OG_IMAGE);
  upsertMeta('meta[property="og:locale"]', { property: 'og:locale' }, 'en_IN');

  upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card' }, 'summary_large_image');
  upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, seo.title);
  upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, seo.description);
  upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image' }, DEFAULT_OG_IMAGE);

  const scriptId = 'cardorbit-jsonld';
  let script = document.getElementById(scriptId) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = scriptId;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(buildJsonLdGraph(seo));
}

/** Inject route-specific SEO into a built HTML template string (prerender). */
export function injectSeoIntoHtml(html: string, seo: SeoDefinition): string {
  const pageUrl = absoluteUrl(seo.path);
  const ogType = seo.ogType ?? 'website';
  const jsonLd = JSON.stringify(buildJsonLdGraph(seo));
  const robots = seo.noindex ? 'noindex,nofollow' : 'index,follow';

  let next = html;
  next = next.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(seo.title)}</title>`);
  next = replaceMetaContent(next, 'name="description"', seo.description);
  next = upsertMetaInHtml(next, 'name="robots"', robots);
  next = next.replace(
    /<link rel="canonical" href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${pageUrl}" />`,
  );
  next = replaceMetaContent(next, 'property="og:type"', ogType);
  next = replaceMetaContent(next, 'property="og:url"', pageUrl);
  next = replaceMetaContent(next, 'property="og:title"', seo.title);
  next = replaceMetaContent(next, 'property="og:description"', seo.description);
  next = upsertMetaInHtml(next, 'property="og:image"', DEFAULT_OG_IMAGE);
  next = replaceMetaContent(next, 'name="twitter:title"', seo.title);
  next = replaceMetaContent(next, 'name="twitter:description"', seo.description);
  next = upsertMetaInHtml(next, 'name="twitter:image"', DEFAULT_OG_IMAGE);

  if (next.includes('application/ld+json')) {
    next = next.replace(
      /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
      `<script type="application/ld+json" id="cardorbit-jsonld">\n${jsonLd}\n    </script>`,
    );
  }

  return next;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function replaceMetaContent(html: string, attr: string, content: string): string {
  const re = new RegExp(`(<meta\\s+${attr}\\s+content=")([^"]*)("\\s*\\/?>)`, 'i');
  if (re.test(html)) {
    return html.replace(re, `$1${escapeHtml(content)}$3`);
  }
  const re2 = new RegExp(`(<meta\\s+content=")([^"]*)("\\s+${attr}\\s*\\/?>)`, 'i');
  if (re2.test(html)) {
    return html.replace(re2, `$1${escapeHtml(content)}$3`);
  }
  return upsertMetaInHtml(html, attr, content);
}

function upsertMetaInHtml(html: string, attr: string, content: string): string {
  const re = new RegExp(`<meta\\s+${attr}[^>]*>`, 'i');
  const tag = `<meta ${attr} content="${escapeHtml(content)}" />`;
  if (re.test(html)) {
    return html.replace(re, tag);
  }
  return html.replace('</head>', `    ${tag}\n  </head>`);
}
