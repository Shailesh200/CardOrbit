import { resolveMerchantLogo } from '@lib/brand-assets';
import { useBrandRegistry } from '../../hooks/useBrandRegistry';

type Props = {
  name: string;
  slug: string;
  logoUrl?: string | null;
  className?: string;
};

/** Merchant badge with logo from API registry, inline URL, or flat placeholder. */
export function MerchantMark({ name, slug, logoUrl, className }: Props) {
  const registryState = useBrandRegistry();
  const registry = registryState.status === 'ready' ? registryState.registry : null;
  const resolvedLogo = resolveMerchantLogo(registry, slug, logoUrl);

  return (
    <span
      className={`merchant-mark merchant-mark--${slug.replace(/-\d+$/, '')} ${className ?? ''}`}
    >
      <img
        src={resolvedLogo}
        alt=""
        draggable={false}
        className="merchant-mark__logo size-5 shrink-0 rounded-md object-contain bg-white/95 p-0.5"
        onError={(event) => {
          const img = event.currentTarget;
          if (img.getAttribute('data-fallback') === '1') return;
          img.setAttribute('data-fallback', '1');
          img.src = '/placeholders/merchant-default.png';
        }}
      />
      {name}
    </span>
  );
}
