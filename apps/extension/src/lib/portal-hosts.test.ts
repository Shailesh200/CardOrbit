import { describe, expect, it } from 'vitest';

import {
  getIssuerPortalContentScriptMatches,
  ISSUER_PORTAL_HOST_RULES,
  resolveIssuerPortalFromHostname,
  resolveIssuerPortalFromUrl,
} from './portal-hosts';

describe('portal-hosts (M-055+)', () => {
  it('covers every catalogued bank portal', () => {
    expect(ISSUER_PORTAL_HOST_RULES.length).toBeGreaterThanOrEqual(15);
    const slugs = ISSUER_PORTAL_HOST_RULES.map((rule) => rule.slug);
    expect(slugs).toContain('hdfc-smartbuy');
    expect(slugs).toContain('icici-travel');
    expect(slugs).toContain('kotak-travel');
    expect(slugs).toContain('idfc-first-travel');
    expect(slugs).toContain('citi-travel');
  });

  it('detects SmartBuy, main bank, and other issuer portals', () => {
    expect(resolveIssuerPortalFromHostname('www.smartbuy.hdfcbank.com')?.slug).toBe(
      'hdfc-smartbuy',
    );
    expect(resolveIssuerPortalFromHostname('hdfcbank.com')?.slug).toBe('hdfc-smartbuy');
    expect(resolveIssuerPortalFromHostname('icicibank.com')?.slug).toBe('icici-travel');
    expect(resolveIssuerPortalFromHostname('kotak.com')?.slug).toBe('kotak-travel');
    expect(resolveIssuerPortalFromHostname('amextravel.com')?.slug).toBe('amex-travel');
  });

  it('resolves from full URL', () => {
    expect(
      resolveIssuerPortalFromUrl('https://www.smartbuy.hdfcbank.com/flights')?.name,
    ).toBe('HDFC SmartBuy');
    expect(resolveIssuerPortalFromUrl('https://www.sbicard.com/offers')?.slug).toBe(
      'sbi-travel',
    );
  });

  it('builds content script matches for all portal hosts', () => {
    const matches = getIssuerPortalContentScriptMatches();
    expect(matches).toContain('*://*.smartbuy.hdfcbank.com/*');
    expect(matches).toContain('*://*.icicibank.com/*');
    expect(matches).toContain('*://*.idfcfirstbank.com/*');
    expect(matches.length).toBeGreaterThan(20);
  });
});
