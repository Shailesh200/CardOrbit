export function CardStackIllustration({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 360 280"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="card-back"
          x1="80"
          y1="100"
          x2="256"
          y2="220"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="oklch(0.55 0.08 200)" />
          <stop offset="1" stopColor="oklch(0.42 0.1 200)" />
        </linearGradient>
        <linearGradient
          id="card-mid"
          x1="64"
          y1="80"
          x2="240"
          y2="200"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="oklch(0.48 0.11 190)" />
          <stop offset="1" stopColor="oklch(0.38 0.11 190)" />
        </linearGradient>
        <linearGradient
          id="card-front"
          x1="96"
          y1="56"
          x2="272"
          y2="176"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="oklch(0.42 0.12 185)" />
          <stop offset="1" stopColor="oklch(0.3 0.09 200)" />
        </linearGradient>
        <linearGradient id="chip" x1="128" y1="92" x2="168" y2="124" gradientUnits="userSpaceOnUse">
          <stop stopColor="oklch(0.86 0.07 85)" />
          <stop offset="1" stopColor="oklch(0.7 0.09 75)" />
        </linearGradient>
        <filter id="card-shadow" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="14" stdDeviation="12" floodColor="oklch(0.2 0.04 250 / 0.35)" />
        </filter>
      </defs>
      <ellipse cx="180" cy="248" rx="110" ry="14" fill="oklch(0.22 0.04 250 / 0.18)" />
      <g filter="url(#card-shadow)">
        <rect
          x="80"
          y="108"
          width="176"
          height="112"
          rx="14"
          fill="url(#card-back)"
          transform="rotate(-6 168 164)"
        />
        <rect
          x="64"
          y="88"
          width="176"
          height="112"
          rx="14"
          fill="url(#card-mid)"
          transform="rotate(-2 152 144)"
        />
        <rect x="96" y="64" width="176" height="112" rx="14" fill="url(#card-front)" />
        <rect x="128" y="96" width="40" height="32" rx="6" fill="url(#chip)" />
        <path
          d="M132 104h32M132 112h32M132 120h32M140 96v32M156 96v32"
          stroke="oklch(0.5 0.06 75 / 0.55)"
          strokeWidth="1.5"
        />
        <rect x="128" y="144" width="56" height="8" rx="4" fill="white" opacity="0.92" />
        <rect x="128" y="160" width="96" height="6" rx="3" fill="white" opacity="0.5" />
        <rect x="128" y="174" width="72" height="6" rx="3" fill="white" opacity="0.35" />
        <circle cx="248" cy="152" r="18" fill="white" opacity="0.2" />
        <circle cx="264" cy="152" r="18" fill="white" opacity="0.12" />
      </g>
    </svg>
  );
}
