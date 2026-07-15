import { resolveMerchantLogo } from '../lib/brand-assets';
import { useBrandRegistry } from '../hooks/useBrandRegistry';

type Props = {
  name: string;
  slug: string;
  logoUrl?: string | null;
  className?: string;
};

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
      />
      {name}
    </span>
  );
}
