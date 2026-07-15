import { describe, expect, it } from 'vitest';

import {
  getMerchantContentScriptMatches,
  normalizeHostname,
  resolveMerchantSlugFromHostname,
  resolveMerchantSlugFromUrl,
} from './merchant-hosts';

describe('merchant-hosts (M-021)', () => {
  it('normalizes www prefix', () => {
    expect(normalizeHostname('www.amazon.in')).toBe('amazon.in');
  });

  it('detects known merchants from hostname', () => {
    expect(resolveMerchantSlugFromHostname('swiggy.com')).toBe('swiggy');
    expect(resolveMerchantSlugFromHostname('www.amazon.in')).toBe('amazon');
    expect(resolveMerchantSlugFromHostname('shop.myntra.com')).toBe('myntra');
  });

  it('returns null for unknown hosts', () => {
    expect(resolveMerchantSlugFromHostname('example.com')).toBeNull();
  });

  it('detects merchant from checkout URL', () => {
    expect(resolveMerchantSlugFromUrl('https://www.flipkart.com/checkout')).toBe('flipkart');
    expect(resolveMerchantSlugFromUrl('chrome-extension://abc/popup.html')).toBeNull();
  });

  it('builds content script match patterns for supported merchants', () => {
    const matches = getMerchantContentScriptMatches();
    expect(matches).toContain('*://*.amazon.in/*');
    expect(matches).toContain('*://swiggy.com/*');
    expect(matches.length).toBeGreaterThan(20);
  });
});
