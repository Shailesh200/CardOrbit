/** Hostname → merchant slug rules for supported checkout sites (M-021 V1). */
export const MERCHANT_HOST_RULES: ReadonlyArray<{ slug: string; hosts: readonly string[] }> = [
  { slug: 'amazon', hosts: ['amazon.in', 'amazon.com'] },
  { slug: 'flipkart', hosts: ['flipkart.com'] },
  { slug: 'myntra', hosts: ['myntra.com'] },
  { slug: 'ajio', hosts: ['ajio.com'] },
  { slug: 'nykaa', hosts: ['nykaa.com'] },
  { slug: 'swiggy', hosts: ['swiggy.com'] },
  { slug: 'zomato', hosts: ['zomato.com'] },
  { slug: 'bigbasket', hosts: ['bigbasket.com'] },
  { slug: 'blinkit', hosts: ['blinkit.com'] },
  { slug: 'zepto', hosts: ['zeptonow.com', 'zepto.com'] },
  { slug: 'uber', hosts: ['uber.com'] },
  { slug: 'ola', hosts: ['olacabs.com', 'ola.com'] },
  { slug: 'irctc', hosts: ['irctc.co.in'] },
  { slug: 'makemytrip', hosts: ['makemytrip.com'] },
  { slug: 'goibibo', hosts: ['goibibo.com'] },
  { slug: 'cleartrip', hosts: ['cleartrip.com'] },
  { slug: 'indigo', hosts: ['goindigo.in'] },
  { slug: 'air-india', hosts: ['airindia.com'] },
  { slug: 'bookmyshow', hosts: ['bookmyshow.com'] },
  { slug: 'paytm', hosts: ['paytm.com'] },
  { slug: 'phonepe', hosts: ['phonepe.com'] },
];

export function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^www\./, '');
}

/** Resolve a merchant slug from a page hostname, or null if unknown. */
export function resolveMerchantSlugFromHostname(hostname: string): string | null {
  const normalized = normalizeHostname(hostname);
  for (const rule of MERCHANT_HOST_RULES) {
    if (rule.hosts.some((host) => normalized === host || normalized.endsWith(`.${host}`))) {
      return rule.slug;
    }
  }
  return null;
}

/** Resolve merchant slug from a full URL string. */
export function resolveMerchantSlugFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return resolveMerchantSlugFromHostname(parsed.hostname);
  } catch {
    return null;
  }
}

/** Manifest content_script match patterns for supported merchant hosts (M-032). */
export function getMerchantContentScriptMatches(): string[] {
  const patterns = new Set<string>();
  for (const rule of MERCHANT_HOST_RULES) {
    for (const host of rule.hosts) {
      patterns.add(`*://*.${host}/*`);
      patterns.add(`*://${host}/*`);
    }
  }
  return [...patterns];
}
