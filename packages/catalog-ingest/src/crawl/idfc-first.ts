import type { IngestCardBundle } from '@cardwise/validation';

import { inferBenefitCategory, normalizeHighlightKey } from './benefit-categories';
import { fetchText } from './http';
import { parseIdfcProductPageHtml } from './idfc-html';
import {
  collectOffers,
  extractJsonLdBlocks,
  findBestCreditCardSchema,
  formatFeesSummary,
  parseHtmlFallback,
} from './json-ld';

export const IDFC_FIRST_BANK_SLUG = 'idfc-first';
export const IDFC_FIRST_BASE_URL = 'https://www.idfcfirst.bank.in';
export const IDFC_FIRST_CATALOG_URL = `${IDFC_FIRST_BASE_URL}/credit-card`;

const PATH_DISPLAY_NAMES: Record<string, string> = {
  '/credit-card/rupay-credit-card': 'IDFC FIRST RuPay Credit Card',
  '/credit-card/secured-rupay-credit-card': 'IDFC FIRST Secured RuPay Credit Card',
  '/credit-card/FIRSTPrivateCreditCard': 'IDFC FIRST Private Credit Card',
  '/credit-card/hpcl-power-fuel-credit-card': 'IDFC FIRST Power / Power+ Fuel Credit Card',
  '/credit-card/wow-black-credit-card': 'IDFC FIRST WOW! Black Credit Card',
};

const EXCLUDED_PATH_PATTERNS: RegExp[] = [
  /^\/credit-card\/?$/,
  /\/benefits(\/|$)/,
  /\/ntb-diy\//,
  /\/add-on/,
  /track-my-application/,
  /referral/,
  /balance-transfer/,
  /-payment$/,
  /\/card-payment/,
  /\/mitc$/,
  /steps-to-/,
  /\/wow\//,
  /Quick-Cash/,
  /forex-cards/,
  /fuel-credit-cards$/,
  /lounge-access-cards$/,
  /lifetime-free-credit-card$/,
  /\/metal-credit-card$/,
  /premium-credit-card$/,
  /^\/credit-card\/cashback-credit-card$/,
  /\/rupay$/,
  /business-credit-card-sme/,
  /credit-card-offer/,
  /credit-card-rewards/,
  /what-is-/,
  /how-/,
  /why-/,
  /key-factors/,
  /7-smart/,
  /10-benefits/,
  /first-select-vs-/,
  /luxury-lifestyle/,
  /image-card/,
  /cc-cli-/,
  /activate-credit-card/,
  /payment-passkey/,
  /customer-care/,
  /offers\//,
  /rural-banking/,
  /startup-banking/,
  /kisan-credit-card/,
];

type CrawlCardResult = {
  path: string;
  sourceUrl: string;
  bundle: IngestCardBundle;
};

function normalizePath(path: string): string {
  const withoutQuery = path.split('?')[0]?.split('#')[0] ?? path;
  if (!withoutQuery.startsWith('/credit-card/')) return '';
  return withoutQuery.replace(/\/+$/, '') || withoutQuery;
}

function isExcludedPath(path: string): boolean {
  return EXCLUDED_PATH_PATTERNS.some((pattern) => pattern.test(path));
}

function extractPathsFromHtml(html: string): string[] {
  const paths = new Set<string>();
  const hrefPattern = /href="(\/credit-card\/[^"#?]+)/gi;
  for (const match of html.matchAll(hrefPattern)) {
    const path = normalizePath(match[1] ?? '');
    if (!path || isExcludedPath(path)) continue;
    paths.add(path);
  }
  return [...paths];
}

function extractPathsFromSitemap(xml: string): string[] {
  const paths = new Set<string>();
  const locPattern = /<loc>(https:\/\/www\.idfcfirst\.bank\.in(\/credit-card\/[^<]+))<\/loc>/gi;
  for (const match of xml.matchAll(locPattern)) {
    const path = normalizePath(match[2] ?? '');
    if (!path || isExcludedPath(path)) continue;
    paths.add(path);
  }
  return [...paths];
}

function toAbsoluteUrl(path: string): string {
  return `${IDFC_FIRST_BASE_URL}${path}`;
}

function pathToSlug(path: string): string {
  const overrideSlugs: Record<string, string> = {
    '/credit-card/FIRSTPrivateCreditCard': `${IDFC_FIRST_BANK_SLUG}-first-private`,
  };
  if (overrideSlugs[path]) return overrideSlugs[path];

  const segment = path
    .replace(/^\/credit-card\/?/, '')
    .replace(/\//g, '-')
    .replace(/[^a-z0-9-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return `${IDFC_FIRST_BANK_SLUG}-${segment || 'card'}`;
}

function mergeHighlights(items: IngestCardBundle['highlights']): IngestCardBundle['highlights'] {
  const byKey = new Map<string, IngestCardBundle['highlights'][number]>();
  for (const item of items) {
    const key = normalizeHighlightKey(item.title);
    const existing = byKey.get(key);
    if (!existing || (item.description?.length ?? 0) > (existing.description?.length ?? 0)) {
      byKey.set(key, item);
    }
  }
  return [...byKey.values()];
}

function highlightsToBenefits(highlights: IngestCardBundle['highlights']): IngestCardBundle['benefits'] {
  return highlights.map((item) => ({
    benefitTypeCode: item.category,
    title: item.title,
    description: item.description ?? null,
    sourceUrl: item.sourceUrl ?? null,
  }));
}

function inferTier(name: string, path: string): IngestCardBundle['tier'] {
  const haystack = `${name} ${path}`.toLowerCase();
  if (
    haystack.includes('private') ||
    haystack.includes('diamond reserve') ||
    haystack.includes('mayura') ||
    haystack.includes('ashva')
  ) {
    return 'ULTRA_PREMIUM';
  }
  if (haystack.includes('gaj') || haystack.includes('wealth') || haystack.includes('business max')) {
    return 'SUPER_PREMIUM';
  }
  if (
    haystack.includes('select') ||
    haystack.includes('indigo') ||
    haystack.includes('vistara') ||
    haystack.includes('lic select')
  ) {
    return 'PREMIUM';
  }
  if (haystack.includes('corporate') || haystack.includes('business')) {
    return 'STANDARD';
  }
  if (
    haystack.includes('millennia') ||
    haystack.includes('classic') ||
    haystack.includes('wow') ||
    haystack.includes('secured') ||
    haystack.includes('fd')
  ) {
    return 'ENTRY';
  }
  return 'STANDARD';
}

function inferNetwork(name: string, path: string): IngestCardBundle['networkCode'] {
  const haystack = `${name} ${path}`.toLowerCase();
  if (haystack.includes('rupay')) return 'RUPAY';
  return 'VISA';
}

function parseAnnualFee(text: string): number | null {
  const lower = text.toLowerCase();
  if (lower.includes('lifetime free') || lower.includes('zero annual fee') || lower.includes('no annual fee')) {
    return 0;
  }
  const match = text.match(/annual fee[^₹\d]{0,20}₹\s*([\d,]+)/i);
  if (match?.[1]) return Number(match[1].replace(/,/g, ''));
  return null;
}

function parseRewardMultiplier(text: string): number | undefined {
  const match = text.match(/(\d+(?:\.\d+)?)\s*x/i);
  if (!match?.[1]) return undefined;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function cleanCardName(rawName: string, path: string): string {
  const override = PATH_DISPLAY_NAMES[path];
  if (override) return override;

  let trimmed = rawName.trim();
  trimmed = trimmed
    .replace(/^Apply for (the )?/i, '')
    .replace(/\s+Online$/i, '')
    .split('|')[0]
    ?.trim() ?? trimmed;
  trimmed = trimmed
    .replace(/\s*-\s*Instant EMI.*$/i, '')
    .replace(/\s*-\s*Card for Business Purchases$/i, '')
    .replace(/\s*-\s*Premium Travel.*$/i, '')
    .trim();

  if (trimmed.length >= 8) return trimmed;

  const fallback = path
    .replace(/^\/credit-card\/?/, '')
    .split('/')
    .pop()
    ?.replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
  return fallback ? `IDFC FIRST ${fallback}` : 'IDFC FIRST Credit Card';
}

export async function discoverIdfcFirstCardPaths(): Promise<string[]> {
  const [catalogHtml, sitemapXml] = await Promise.all([
    fetchText(IDFC_FIRST_CATALOG_URL),
    fetchText(`${IDFC_FIRST_BASE_URL}/sitemap.xml`).catch(() => ''),
  ]);

  const paths = new Set<string>([
    ...extractPathsFromHtml(catalogHtml),
    ...extractPathsFromSitemap(sitemapXml),
  ]);

  return [...paths].sort();
}

export async function crawlIdfcFirstCard(path: string): Promise<CrawlCardResult | null> {
  const normalizedPath = normalizePath(path);
  if (!normalizedPath || isExcludedPath(normalizedPath)) return null;

  const sourceUrl = toAbsoluteUrl(normalizedPath);
  const html = await fetchText(sourceUrl);
  const schema = findBestCreditCardSchema(extractJsonLdBlocks(html));
  const fallback = schema ? null : parseHtmlFallback(html);
  if (!schema && !fallback) return null;

  const offers = schema ? collectOffers(schema) : [];
  const cardName = cleanCardName(schema?.name ?? fallback?.name ?? '', normalizedPath);
  const slug = pathToSlug(normalizedPath);
  const description = schema?.description?.trim() ?? fallback?.description ?? null;
  const feesSummary = formatFeesSummary(schema?.feesAndCommissionsSpecification);
  const pageDetails = parseIdfcProductPageHtml(html, sourceUrl, cardName, normalizedPath);

  const jsonHighlights: IngestCardBundle['highlights'] = offers.map((offer) => ({
    category: inferBenefitCategory(offer.name, offer.description),
    title: offer.name,
    description: offer.description || null,
    sourceUrl,
  }));

  if (!jsonHighlights.length && description) {
    jsonHighlights.push({
      category: 'REWARDS',
      title: 'Product overview',
      description,
      sourceUrl,
    });
  }

  const pageHighlights: IngestCardBundle['highlights'] = pageDetails.highlights.map((item) => ({
    category: item.category,
    title: item.title,
    description: item.description,
    sourceUrl: item.sourceUrl,
  }));

  const highlights = mergeHighlights([...pageHighlights, ...jsonHighlights]);
  const structuredFees =
    pageDetails.structuredFees.length > 0
      ? pageDetails.structuredFees
      : feesSummary
        ? [{ feeKind: 'OTHER' as const, label: 'Fees & charges (issuer summary)', value: feesSummary }]
        : [];

  for (const fee of structuredFees) {
    if (fee.feeKind === 'JOINING' || fee.feeKind === 'ANNUAL') continue;
    highlights.push({
      category: 'FEES',
      title: fee.label,
      description: fee.value,
      sourceUrl,
    });
  }

  const mergedHighlights = mergeHighlights(highlights);

  const annualFeeInr =
    pageDetails.annualFeeInr ??
    parseAnnualFee(`${description ?? ''} ${feesSummary ?? ''} ${structuredFees.map((f) => f.value).join(' ')}`);
  const joiningFeeInr = pageDetails.joiningFeeInr ?? annualFeeInr;

  const rewardText = mergedHighlights
    .filter((item) => item.category === 'REWARDS')
    .map((item) => `${item.title} ${item.description ?? ''}`)
    .join(' ');
  const rewardMultiplier = parseRewardMultiplier(rewardText) ?? parseRewardMultiplier(description ?? '');
  const rewardRules: IngestCardBundle['rewardRules'] = rewardMultiplier
    ? [
        {
          ruleKey: `${slug}-base-rewards`,
          name: 'Base reward points (crawled summary)',
          spendCategoryCode: null,
          merchantSlug: null,
          payload: { rewardMultiplier, exclusions: [] },
          validFrom: '2026-01-01',
          validUntil: null,
          sourceUrl,
        },
      ]
    : [];

  const bundle: IngestCardBundle = {
    bankSlug: IDFC_FIRST_BANK_SLUG,
    bankSourceUrl: IDFC_FIRST_CATALOG_URL,
    name: cardName,
    slug,
    sourceUrl,
    networkCode: inferNetwork(cardName, normalizedPath),
    tier: inferTier(cardName, normalizedPath),
    annualFeeInr,
    joiningFeeInr,
    rewardProgramSlug: 'idfc-first-rewards',
    pointValueInr: 0.25,
    tags: pageDetails.tags,
    structuredFees,
    highlights: mergedHighlights,
    approvalSummary: pageDetails.approvalSummary,
    eligibilitySummary: pageDetails.eligibilitySummary,
    benefits: highlightsToBenefits(mergedHighlights),
    rewardRules,
    crawlDescription: description,
    feesSummary,
  };

  return { path: normalizedPath, sourceUrl, bundle };
}

export async function crawlIdfcFirstBank(): Promise<CrawlCardResult[]> {
  const paths = await discoverIdfcFirstCardPaths();
  const results: CrawlCardResult[] = [];

  for (const path of paths) {
    try {
      const crawled = await crawlIdfcFirstCard(path);
      if (crawled) results.push(crawled);
    } catch {
      // Skip pages that fail to fetch or parse.
    }
  }

  const bySlug = new Map<string, CrawlCardResult>();
  for (const item of results) {
    bySlug.set(item.bundle.slug, item);
  }

  return [...bySlug.values()].sort((a, b) => a.bundle.name.localeCompare(b.bundle.name));
}
