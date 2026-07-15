import { cn } from '@cardwise/ui';

type HeroLogoMarkProps = {
  className?: string;
  idSuffix?: string;
};

/** CardOrbit orbital mark — shared by HeroLogo and favicon. */
export function HeroLogoMark({ className, idSuffix = 'default' }: HeroLogoMarkProps) {
  const gradId = `hero-co-grad-${idSuffix}`;

  return (
    <svg
      aria-hidden
      className={cn('shrink-0', className)}
      viewBox="0 0 52 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradId} x1="8" y1="6" x2="44" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4F8CFF" />
          <stop offset="1" stopColor="#7C5CFF" />
        </linearGradient>
      </defs>
      {/* Soft plate */}
      <rect x="2" y="2" width="48" height="48" rx="14" fill="#0B1023" />
      <rect
        x="2"
        y="2"
        width="48"
        height="48"
        rx="14"
        stroke="rgb(255 255 255 / 0.1)"
        strokeWidth="1"
      />
      {/* Outer orbit ring */}
      <circle
        cx="26"
        cy="26"
        r="14"
        stroke={`url(#${gradId})`}
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeDasharray="72 16"
        transform="rotate(-35 26 26)"
      />
      {/* Inner thin ring */}
      <circle cx="26" cy="26" r="8.5" stroke="rgb(255 255 255 / 0.18)" strokeWidth="1.25" />
      {/* Orbiting node */}
      <circle cx="37.5" cy="14.5" r="3.25" fill={`url(#${gradId})`} />
      <circle cx="37.5" cy="14.5" r="3.25" fill="rgb(255 255 255 / 0.2)" />
    </svg>
  );
}
