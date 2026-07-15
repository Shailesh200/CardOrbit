import {
  listActiveIssuerTravelPortals,
  type IssuerTravelPortal,
} from '@cardwise/validation';

/** Issuer travel portal domain → channel metadata for extension assist (M-055+). */

export type IssuerPortalHostRule = {
  slug: string;
  name: string;
  bankName: string;
  hosts: readonly string[];
  accelerationSummary: string;
  cardHints: readonly string[];
};

function toHostRule(portal: IssuerTravelPortal): IssuerPortalHostRule {
  return {
    slug: portal.slug,
    name: portal.name,
    bankName: portal.bankName,
    hosts: portal.domains,
    accelerationSummary: portal.acceleration.summary,
    cardHints: portal.supportedCardHints,
  };
}

/** All active issuer portals — overlays run on every catalogued bank domain. */
export const ISSUER_PORTAL_HOST_RULES: readonly IssuerPortalHostRule[] =
  listActiveIssuerTravelPortals().map(toHostRule);

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^www\./, '');
}

export function resolveIssuerPortalFromHostname(hostname: string): IssuerPortalHostRule | null {
  const normalized = normalizeHostname(hostname);
  for (const rule of ISSUER_PORTAL_HOST_RULES) {
    if (rule.hosts.some((host) => normalized === host || normalized.endsWith(`.${host}`))) {
      return rule;
    }
  }
  return null;
}

export function resolveIssuerPortalFromUrl(url: string): IssuerPortalHostRule | null {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return resolveIssuerPortalFromHostname(parsed.hostname);
  } catch {
    return null;
  }
}

/** Content-script match patterns for all issuer travel / bank portal hosts. */
export function getIssuerPortalContentScriptMatches(): string[] {
  const patterns = new Set<string>();
  for (const rule of ISSUER_PORTAL_HOST_RULES) {
    for (const host of rule.hosts) {
      patterns.add(`*://*.${host}/*`);
      patterns.add(`*://${host}/*`);
    }
  }
  return [...patterns];
}
