import { cn } from '@cardwise/ui';

import { placeholderAssets } from '@lib/brand-assets';
import { useMouseParallax } from '../../hooks/useMouseParallax';

type Props = {
  className?: string;
  variant?: 'generic' | 'showcase';
};

function ShowcaseCardPhoto() {
  return (
    <img src={placeholderAssets.creditCard} alt="" draggable={false} className="card-face__photo" />
  );
}

/** CSS 3D card stack with mouse parallax and light sweep. */
export function AnimatedCardStack({ className, variant = 'generic' }: Props) {
  const ref = useMouseParallax<HTMLDivElement>({ strength: 10 });
  const showcase = variant === 'showcase';

  return (
    <div
      ref={ref}
      className={cn('card-stage relative', showcase && 'card-stage--showcase', className)}
      aria-hidden
    >
      <div className="card-stage__aura" />
      <div className="card-orbit">
        <div className={cn('card-face card-face--back', showcase && 'card-face--axis')}>
          {showcase ? <ShowcaseCardPhoto /> : null}
        </div>
        <div className={cn('card-face card-face--mid', showcase && 'card-face--icici')}>
          {showcase ? <ShowcaseCardPhoto /> : null}
        </div>
        <div className={cn('card-face card-face--front', showcase && 'card-face--hdfc-regalia')}>
          {showcase ? (
            <ShowcaseCardPhoto />
          ) : (
            <>
              <div className="card-face__chip" />
              <div className="card-face__lines">
                <span />
                <span />
                <span />
              </div>
              <div className="card-face__logo" />
            </>
          )}
        </div>
      </div>
      <div className="card-stage__glow" />
    </div>
  );
}
