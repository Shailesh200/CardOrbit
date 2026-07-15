export type IllustrationId = 'card-stack' | 'empty-wallet' | 'auth-hero';

type IllustrationConfig = {
  /** Public URL under /illustrations — drop a matching file to swap without rebuild. */
  publicPath: string;
  alt: string;
};

export const illustrationAssets: Record<IllustrationId, IllustrationConfig> = {
  'card-stack': {
    publicPath: '/illustrations/card-stack.webp',
    alt: 'Stylized credit card stack',
  },
  'empty-wallet': {
    publicPath: '/illustrations/empty-wallet.webp',
    alt: 'Empty wallet ready for cards',
  },
  'auth-hero': {
    publicPath: '/illustrations/auth-hero.webp',
    alt: 'CardOrbit financial intelligence',
  },
};
