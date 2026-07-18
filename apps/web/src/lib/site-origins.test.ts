import { afterEach, describe, expect, it, vi } from 'vitest';

import { appHref, isAppOnlyPath, isLandingOnlyPath, landingHref } from './site-origins';

describe('site-origins', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('classifies app-only paths', () => {
    expect(isAppOnlyPath('/login')).toBe(true);
    expect(isAppOnlyPath('/account/cards')).toBe(true);
    expect(isAppOnlyPath('/')).toBe(false);
    expect(isAppOnlyPath('/privacy')).toBe(false);
  });

  it('classifies landing-only legal paths', () => {
    expect(isLandingOnlyPath('/privacy')).toBe(true);
    expect(isLandingOnlyPath('/terms')).toBe(true);
    expect(isLandingOnlyPath('/cookies')).toBe(true);
    expect(isLandingOnlyPath('/login')).toBe(false);
  });

  it('keeps relative hrefs on localhost', () => {
    expect(appHref('/login')).toBe('/login');
    expect(landingHref('/')).toBe('/');
  });
});
