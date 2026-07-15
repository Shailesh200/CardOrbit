export function EmptyWalletIllustration({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 240 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="wallet-body"
          x1="48"
          y1="40"
          x2="192"
          y2="168"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="oklch(0.96 0.01 240)" />
          <stop offset="1" stopColor="oklch(0.9 0.02 240)" />
        </linearGradient>
        <linearGradient
          id="wallet-flap"
          x1="56"
          y1="48"
          x2="184"
          y2="88"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="oklch(0.48 0.11 185)" />
          <stop offset="1" stopColor="oklch(0.36 0.1 185)" />
        </linearGradient>
        <filter id="wallet-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="oklch(0.2 0.04 250 / 0.22)" />
        </filter>
      </defs>
      <ellipse cx="120" cy="172" rx="72" ry="10" fill="oklch(0.22 0.04 250 / 0.1)" />
      <g filter="url(#wallet-shadow)">
        <rect x="48" y="56" width="144" height="96" rx="16" fill="url(#wallet-body)" />
        <path
          d="M48 72c0-8.837 7.163-16 16-16h112c8.837 0 16 7.163 16 16v20H48V72z"
          fill="url(#wallet-flap)"
        />
        <rect
          x="64"
          y="96"
          width="112"
          height="40"
          rx="10"
          stroke="oklch(0.42 0.12 185)"
          strokeWidth="2"
          strokeDasharray="10 8"
          fill="oklch(0.99 0.005 240 / 0.7)"
        />
        <rect x="76" y="108" width="64" height="8" rx="4" fill="oklch(0.42 0.12 185 / 0.18)" />
        <rect x="76" y="122" width="40" height="6" rx="3" fill="oklch(0.42 0.12 185 / 0.1)" />
        <circle cx="168" cy="116" r="12" fill="oklch(0.42 0.12 185 / 0.3)" />
        <circle cx="168" cy="116" r="6" fill="oklch(0.99 0.01 185)" />
      </g>
    </svg>
  );
}
