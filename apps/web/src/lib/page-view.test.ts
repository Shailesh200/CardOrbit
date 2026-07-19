import { describe, expect, it } from 'vitest';

import { analyticsSearchKeys, classifyAnalyticsHost, normalizeAnalyticsPath } from './page-view';

describe('page-view helpers', () => {
  it('normalizes trailing slashes', () => {
    expect(normalizeAnalyticsPath('/')).toBe('/');
    expect(normalizeAnalyticsPath('/account/cards/')).toBe('/account/cards');
    expect(normalizeAnalyticsPath('/login')).toBe('/login');
  });

  it('keeps query keys only and strips sensitive params', () => {
    expect(analyticsSearchKeys('')).toBeUndefined();
    expect(analyticsSearchKeys('?utm_source=google&token=secret')).toBe('utm_source');
    expect(analyticsSearchKeys('?b=2&a=1')).toBe('a,b');
  });

  it('classifies host surface', () => {
    expect(classifyAnalyticsHost({ isLandingHost: true, isAppHost: false })).toBe('landing');
    expect(classifyAnalyticsHost({ isLandingHost: false, isAppHost: true })).toBe('app');
    expect(classifyAnalyticsHost({ isLandingHost: false, isAppHost: false })).toBe('other');
  });
});
