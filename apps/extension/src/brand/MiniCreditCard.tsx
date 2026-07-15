import { cn } from '@cardwise/ui';

import { resolveCreditCardImage } from '../lib/brand-assets';
import { useBrandRegistry } from '../hooks/useBrandRegistry';

type MiniCreditCardProps = {
  bankSlug?: string;
  cardSlug?: string;
  cardName?: string;
  imageUrl?: string | null;
  className?: string;
};

export function MiniCreditCard({
  bankSlug = 'hdfc',
  cardSlug,
  cardName,
  imageUrl,
  className,
}: MiniCreditCardProps) {
  const registryState = useBrandRegistry();
  const registry = registryState.status === 'ready' ? registryState.registry : null;
  const slug = cardSlug ?? `${bankSlug}-card`;
  const src = resolveCreditCardImage(registry, slug, imageUrl);

  return (
    <img
      src={src}
      alt={cardName ? `${cardName} card` : 'Credit card'}
      aria-hidden={cardName ? undefined : true}
      draggable={false}
      className={cn(
        'mini-card mini-card--photo aspect-[1.586/1] w-[4.75rem] shrink-0 object-contain object-center',
        className,
      )}
    />
  );
}
