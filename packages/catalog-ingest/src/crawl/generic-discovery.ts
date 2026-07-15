import { bankCatalogUrl } from '../india/bank-sources';
import { fetchHtml } from './http';
import { IDFC_FIRST_BANK_SLUG } from './idfc-first';

const MAX_DISCOVERED_URLS = 80;

const EXCLUDED_PATH_PATTERNS: RegExp[] = [
  /login/i,
  /sign-?in/i,
  /logout/i,
  /register/i,
  /faq/i,
  /terms/i,
  /privacy/i,
  /disclaimer/i,
  /contact/i,
  /customer-?care/i,
  /help/i,
  /support/i,
  /blog/i,
  /news/i,
  /press/i,
  /careers/i,
  /investor/i,
  /branch/i,
  /atm/i,
  /locator/i,
  /calculator/i,
  /compare/i,
  /sitemap/i,
  /search/i,
  /download/i,
  /business/i,
  /commercial/i,
  /corporate/i,
  /sme/i,
  /referral/i,
  /services\//i,
  /loststolen/i,
  /block-/i,
  /apply-for/i,
  /how-to/i,
  /features$/i,
  /benefits$/i,
  /\.pdf$/i,
  /\.jpg$/i,
  /\.png$/i,
  /javascript:/i,
];

/** Paths that often indicate a product/detail page rather than a hub. */
const PRODUCT_PATH_HINTS: RegExp[] = [
  /\/credit-cards\/[a-z0-9][a-z0-9-]*$/i,
  /\/credit-card\/[a-z0-9][a-z0-9-]*$/i,
  /\/cards\/credit-cards?\//i,
];

function normalizeUrl(url: string): string {
  const parsed = new URL(url);
  parsed.hash = '';
  return parsed.href.replace(/\/+$/, '') || parsed.href;
}

function isExcludedPath(pathname: string): boolean {
  return EXCLUDED_PATH_PATTERNS.some((pattern) => pattern.test(pathname));
}

function looksLikeProductPage(pathname: string, catalogPath: string): boolean {
  const normalizedCatalog = catalogPath.replace(/\/+$/, '') || '/';
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';

  if (normalizedPath === normalizedCatalog) return false;

  const isNestedUnderCatalog =
    normalizedPath.startsWith(`${normalizedCatalog}/`) && normalizedPath.length > normalizedCatalog.length + 1;

  const hasProductHint = PRODUCT_PATH_HINTS.some((pattern) => pattern.test(normalizedPath));

  return isNestedUnderCatalog || hasProductHint;
}

function extractCandidateUrls(html: string, catalogUrl: string): string[] {
  const base = new URL(catalogUrl);
  const catalogPath = base.pathname;
  const candidates = new Set<string>();

  const hrefPattern = /href=["']([^"'#]+)["']/gi;
  for (const match of html.matchAll(hrefPattern)) {
    const raw = match[1]?.trim();
    if (!raw || raw.startsWith('mailto:') || raw.startsWith('tel:')) continue;

    let absolute: URL;
    try {
      absolute = new URL(raw, catalogUrl);
    } catch {
      continue;
    }

    if (absolute.protocol !== 'http:' && absolute.protocol !== 'https:') continue;
    if (absolute.hostname !== base.hostname) continue;
    if (isExcludedPath(absolute.pathname)) continue;
    if (!looksLikeProductPage(absolute.pathname, catalogPath)) continue;

    candidates.add(normalizeUrl(absolute.href));
  }

  return [...candidates].sort((a, b) => a.localeCompare(b));
}

/**
 * Discover credit-card product page URLs from a bank's official catalog listing.
 * Used for AI ingest on banks without a dedicated rule-based crawler.
 */
export async function discoverGenericBankCardUrls(bankSlug: string): Promise<string[]> {
  if (bankSlug === IDFC_FIRST_BANK_SLUG) {
    throw new Error('Use discoverIdfcFirstCardPaths for IDFC FIRST');
  }

  const catalogUrl = bankCatalogUrl(bankSlug);
  const { html, finalUrl } = await fetchHtml(catalogUrl);
  const urls = extractCandidateUrls(html, finalUrl).slice(0, MAX_DISCOVERED_URLS);

  if (!urls.length) {
    throw new Error(
      `No card product URLs discovered on ${finalUrl}. The listing page layout may need a bank-specific adapter.`,
    );
  }

  return urls;
}

export function bankCatalogListingUrl(bankSlug: string): string {
  return bankCatalogUrl(bankSlug);
}
