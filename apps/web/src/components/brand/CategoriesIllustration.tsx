import type { CSSProperties } from 'react';
import { Car, Globe, Plane, ShoppingCart, UtensilsCrossed } from 'lucide-react';

const ORBITS = [
  { Icon: UtensilsCrossed, angle: -60, r: 72, delay: '0s' },
  { Icon: Plane, angle: 0, r: 80, delay: '0.15s' },
  { Icon: ShoppingCart, angle: 60, r: 72, delay: '0.3s' },
  { Icon: Car, angle: 120, r: 68, delay: '0.45s' },
  { Icon: Globe, angle: 180, r: 76, delay: '0.6s' },
] as const;

export function CategoriesIllustration({ className }: { className?: string }) {
  return (
    <div className={`onboarding-categories-illus ${className ?? ''}`} aria-hidden>
      <div className="onboarding-categories-illus__ring" />
      <div className="onboarding-categories-illus__core">
        <span className="font-display text-lg font-semibold text-white">₹</span>
      </div>
      {ORBITS.map(({ Icon, angle, r, delay }, index) => {
        const rad = (angle * Math.PI) / 180;
        const x = Math.cos(rad) * r;
        const y = Math.sin(rad) * r;
        return (
          <div
            key={index}
            className="onboarding-categories-illus__orb"
            style={
              {
                '--orb-x': `${x}px`,
                '--orb-y': `${y}px`,
                '--orb-delay': delay,
              } as CSSProperties
            }
          >
            <Icon className="size-4" strokeWidth={2} />
          </div>
        );
      })}
    </div>
  );
}
