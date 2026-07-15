export function SpendingIllustration({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 280 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="spend-bar-a" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="oklch(0.52 0.12 170)" />
          <stop offset="1" stopColor="oklch(0.38 0.1 185)" />
        </linearGradient>
        <linearGradient id="spend-bar-b" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="oklch(0.62 0.1 165)" />
          <stop offset="1" stopColor="oklch(0.45 0.11 175)" />
        </linearGradient>
        <linearGradient id="spend-bar-c" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="oklch(0.72 0.09 85)" />
          <stop offset="1" stopColor="oklch(0.55 0.1 75)" />
        </linearGradient>
        <filter id="spend-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="oklch(0.35 0.1 170 / 0.25)" />
        </filter>
      </defs>
      <ellipse cx="140" cy="196" rx="88" ry="10" fill="oklch(0.22 0.04 250 / 0.1)" />
      <g filter="url(#spend-glow)">
        <rect x="40" y="168" width="200" height="2" rx="1" fill="oklch(0.42 0.12 185 / 0.2)" />
        <rect
          className="onboarding-illus-bar onboarding-illus-bar--1"
          x="52"
          y="108"
          width="44"
          height="60"
          rx="10"
          fill="url(#spend-bar-a)"
        />
        <rect
          className="onboarding-illus-bar onboarding-illus-bar--2"
          x="108"
          y="72"
          width="44"
          height="96"
          rx="10"
          fill="url(#spend-bar-b)"
        />
        <rect
          className="onboarding-illus-bar onboarding-illus-bar--3"
          x="164"
          y="44"
          width="44"
          height="124"
          rx="10"
          fill="url(#spend-bar-c)"
        />
        <circle cx="74" cy="96" r="5" fill="white" opacity="0.85" />
        <circle cx="130" cy="60" r="5" fill="white" opacity="0.85" />
        <circle cx="186" cy="32" r="5" fill="white" opacity="0.85" />
      </g>
      <path
        d="M74 96 L130 60 L186 32"
        stroke="oklch(0.42 0.12 185 / 0.35)"
        strokeWidth="2"
        strokeDasharray="4 6"
        strokeLinecap="round"
      />
    </svg>
  );
}
