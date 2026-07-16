import { afterEach, describe, expect, it, vi } from 'vitest';

import { appHref, isAppOnlyPath, landingHref } from './site-origins';

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

  it('keeps relative hrefs on localhost', () => {
    expect(appHref('/login')).toBe('/login');
    expect(landingHref('/')).toBe('/');
  });
});
