import { useEffect, useState, type ComponentType } from 'react';

import { CardStackIllustration } from '../brand/CardStackIllustration';
import { EmptyWalletIllustration } from '../brand/EmptyWalletIllustration';
import { illustrationAssets, type IllustrationId } from './manifest';

const fallbacks: Record<IllustrationId, ComponentType<{ className?: string }>> = {
  'card-stack': CardStackIllustration,
  'empty-wallet': EmptyWalletIllustration,
  'auth-hero': CardStackIllustration,
};

type Props = {
  id: IllustrationId;
  className?: string;
  /** When true, SVG fallback gets a gentle float animation. */
  animate?: boolean;
};

export function Illustration({ id, className, animate = false }: Props) {
  const config = illustrationAssets[id];
  const Fallback = fallbacks[id];
  const [useImage, setUseImage] = useState<boolean | null>(null);

  useEffect(() => {
    const img = new Image();
    const onLoad = () => setUseImage(true);
    const onError = () => setUseImage(false);
    img.addEventListener('load', onLoad);
    img.addEventListener('error', onError);
    img.src = config.publicPath;
    return () => {
      img.removeEventListener('load', onLoad);
      img.removeEventListener('error', onError);
    };
  }, [config.publicPath]);

  if (useImage === null) {
    return (
      <div aria-hidden className={className} style={{ minHeight: '1px', visibility: 'hidden' }} />
    );
  }

  if (useImage) {
    return <img src={config.publicPath} alt={config.alt} className={className} loading="lazy" />;
  }

  return <Fallback className={animate ? `${className ?? ''} animate-float`.trim() : className} />;
}
