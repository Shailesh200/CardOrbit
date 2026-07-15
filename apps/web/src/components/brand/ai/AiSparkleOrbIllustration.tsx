type Props = {
  className?: string;
};

/** Hero-scale AI orb with orbiting sparkles — landing, dashboard strip, settings. */
export function AiSparkleOrbIllustration({ className }: Props) {
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 320 280"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient
          id="ai-orb-core"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(160 128) rotate(90) scale(72)"
        >
          <stop stopColor="oklch(0.72 0.12 170)" />
          <stop offset="0.55" stopColor="oklch(0.48 0.13 185)" />
          <stop offset="1" stopColor="oklch(0.32 0.1 200)" />
        </radialGradient>
        <linearGradient
          id="ai-orb-ring"
          x1="160"
          y1="56"
          x2="160"
          y2="200"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="oklch(0.62 0.11 165 / 0.9)" />
          <stop offset="1" stopColor="oklch(0.42 0.12 185 / 0.15)" />
        </linearGradient>
        <filter id="ai-orb-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="10" stdDeviation="16" floodColor="oklch(0.42 0.12 185 / 0.35)" />
        </filter>
      </defs>
      <ellipse cx="160" cy="248" rx="96" ry="12" fill="oklch(0.22 0.04 250 / 0.12)" />
      <g filter="url(#ai-orb-glow)">
        <circle
          className="ai-orb__ring"
          cx="160"
          cy="128"
          r="88"
          stroke="url(#ai-orb-ring)"
          strokeWidth="2"
          strokeDasharray="6 10"
        />
        <circle cx="160" cy="128" r="56" fill="url(#ai-orb-core)" />
        <path
          d="M160 88l4.8 14.8L180 108l-14.8 4.8L160 128l-4.8-15.2L140 108l14.8-4.8L160 88z"
          fill="white"
          opacity="0.92"
        />
        <g className="ai-orb__spark ai-orb__spark--1">
          <path
            d="M56 92l2.2 7.2L65.4 102l-7.2 2.2L56 111.4l-2.2-7.2L46.6 102l7.2-2.2L56 92z"
            fill="oklch(0.62 0.11 165)"
          />
        </g>
        <g className="ai-orb__spark ai-orb__spark--2">
          <path
            d="M252 156l2.2 7.2L261.4 166l-7.2 2.2L252 175.4l-2.2-7.2L242.6 166l7.2-2.2L252 156z"
            fill="oklch(0.72 0.09 85)"
          />
        </g>
        <g className="ai-orb__spark ai-orb__spark--3">
          <path
            d="M92 196l1.8 5.8L99.6 204l-5.8 1.8L92 211.6l-1.8-5.8L84.4 204l5.8-1.8L92 196z"
            fill="oklch(0.55 0.1 190)"
          />
        </g>
        <circle
          className="ai-orb__node ai-orb__node--a"
          cx="228"
          cy="88"
          r="6"
          fill="oklch(0.62 0.11 165 / 0.85)"
        />
        <circle
          className="ai-orb__node ai-orb__node--b"
          cx="72"
          cy="148"
          r="5"
          fill="oklch(0.72 0.09 85 / 0.8)"
        />
        <path
          d="M228 88 L160 128 M72 148 L160 128 M252 166 L160 128"
          stroke="oklch(0.42 0.12 185 / 0.25)"
          strokeWidth="1.5"
          strokeDasharray="4 6"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
