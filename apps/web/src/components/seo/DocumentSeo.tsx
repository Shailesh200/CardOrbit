import { useEffect } from 'react';
import { useLocation } from 'react-router';

import { applyDocumentSeo, seoForPath } from '../../lib/seo';
import { isBrowserOnAppHost, isLocalDevHost } from '../../lib/site-origins';

/** Keeps <head> title/meta/canonical/JSON-LD in sync with the active route. */
export function DocumentSeo() {
  const { pathname } = useLocation();

  useEffect(() => {
    const seo = seoForPath(pathname);
    const forceNoIndex = !isLocalDevHost() && isBrowserOnAppHost();
    applyDocumentSeo(seo, { forceNoIndex });
  }, [pathname]);

  return null;
}
