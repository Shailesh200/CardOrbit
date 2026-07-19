import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { trackMarketingCtaClickedClient } from '../../lib/product-analytics';
import { appHref, isBrowserOnLandingHost } from '../../lib/site-origins';

type MarketingCta = {
  placement: 'hero' | 'nav' | 'below_fold' | 'ai_section';
  cta: string;
};

type AppOriginLinkProps = {
  to: string;
  className?: string;
  children: ReactNode;
  /** When set, emits MARKETING_CTA_CLICKED on click (consent-gated). */
  marketingCta?: MarketingCta;
};

/**
 * Link to an app-subdomain route. On cardorbit.in uses an absolute href so
 * signup/login leave the landing host; on app/localhost uses React Router.
 */
export function AppOriginLink({ to, children, className, marketingCta }: AppOriginLinkProps) {
  const onClick = marketingCta
    ? () => {
        trackMarketingCtaClickedClient({
          placement: marketingCta.placement,
          cta: marketingCta.cta,
          destination: to,
        });
      }
    : undefined;

  if (isBrowserOnLandingHost()) {
    return (
      <a href={appHref(to)} className={className} onClick={onClick}>
        {children}
      </a>
    );
  }

  return (
    <Link to={to} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
