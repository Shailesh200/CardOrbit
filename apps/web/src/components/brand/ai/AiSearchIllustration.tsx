type Props = {
  className?: string;
};

/** Semantic search — magnifier with connected keyword nodes. */
export function AiSearchIllustration({ className }: Props) {
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 280 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="ai-search-lens"
          x1="96"
          y1="48"
          x2="176"
          y2="128"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="oklch(0.58 0.11 175)" />
          <stop offset="1" stopColor="oklch(0.38 0.11 190)" />
        </linearGradient>
        <filter id="ai-search-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="oklch(0.35 0.1 170 / 0.22)" />
        </filter>
      </defs>
      <ellipse cx="140" cy="196" rx="88" ry="10" fill="oklch(0.22 0.04 250 / 0.1)" />
      <g filter="url(#ai-search-shadow)">
        <circle
          cx="128"
          cy="92"
          r="52"
          fill="oklch(0.96 0.01 185 / 0.9)"
          stroke="url(#ai-search-lens)"
          strokeWidth="6"
        />
        <path
          d="M168 132l44 44"
          stroke="oklch(0.42 0.12 185)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <g className="ai-search__node ai-search__node--1">
          <rect
            x="36"
            y="44"
            width="56"
            height="24"
            rx="12"
            fill="oklch(0.48 0.12 185 / 0.12)"
            stroke="oklch(0.48 0.12 185 / 0.35)"
          />
          <text
            x="64"
            y="60"
            textAnchor="middle"
            fill="oklch(0.38 0.1 190)"
            fontSize="10"
            fontWeight="600"
          >
            Swiggy
          </text>
        </g>
        <g className="ai-search__node ai-search__node--2">
          <rect
            x="188"
            y="36"
            width="72"
            height="24"
            rx="12"
            fill="oklch(0.55 0.1 75 / 0.12)"
            stroke="oklch(0.55 0.1 75 / 0.35)"
          />
          <text
            x="224"
            y="52"
            textAnchor="middle"
            fill="oklch(0.45 0.09 75)"
            fontSize="9"
            fontWeight="600"
          >
            0% forex
          </text>
        </g>
        <g className="ai-search__node ai-search__node--3">
          <rect
            x="196"
            y="148"
            width="64"
            height="24"
            rx="12"
            fill="oklch(0.62 0.11 165 / 0.12)"
            stroke="oklch(0.62 0.11 165 / 0.35)"
          />
          <text
            x="228"
            y="164"
            textAnchor="middle"
            fill="oklch(0.42 0.1 175)"
            fontSize="9"
            fontWeight="600"
          >
            dining
          </text>
        </g>
        <path
          d="M92 56 L118 78 M224 48 L156 72 M228 160 L156 108"
          stroke="oklch(0.42 0.12 185 / 0.28)"
          strokeWidth="1.5"
          strokeDasharray="4 5"
        />
        <path
          className="ai-search__spark"
          d="M128 72l2.4 7.4L138 82l-7.4 2.4L128 92l-2.4-7.6L118 82l7.4-2.4L128 72z"
          fill="oklch(0.72 0.09 85)"
        />
      </g>
    </svg>
  );
}
