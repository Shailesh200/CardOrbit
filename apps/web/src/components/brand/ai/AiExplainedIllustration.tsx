type Props = {
  className?: string;
};

/** AI-explained pick — card with reward bar and explanation panel. */
export function AiExplainedIllustration({ className }: Props) {
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
          id="ai-expl-card"
          x1="40"
          y1="56"
          x2="176"
          y2="152"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="oklch(0.48 0.12 185)" />
          <stop offset="1" stopColor="oklch(0.3 0.09 200)" />
        </linearGradient>
        <filter id="ai-expl-shadow" x="-15%" y="-15%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="oklch(0.2 0.04 250 / 0.22)" />
        </filter>
      </defs>
      <ellipse cx="140" cy="196" rx="88" ry="10" fill="oklch(0.22 0.04 250 / 0.1)" />
      <g filter="url(#ai-expl-shadow)">
        <rect x="36" y="52" width="144" height="92" rx="14" fill="url(#ai-expl-card)" />
        <rect x="68" y="76" width="36" height="28" rx="6" fill="oklch(0.86 0.07 85)" />
        <rect x="68" y="116" width="56" height="8" rx="4" fill="white" opacity="0.85" />
        <rect x="68" y="130" width="88" height="6" rx="3" fill="white" opacity="0.35" />
        <g className="ai-explained__panel">
          <rect
            x="156"
            y="44"
            width="96"
            height="112"
            rx="16"
            fill="white"
            stroke="oklch(0.42 0.12 185 / 0.2)"
          />
          <rect x="172" y="60" width="64" height="8" rx="4" fill="oklch(0.48 0.12 185 / 0.35)" />
          <rect x="172" y="76" width="48" height="6" rx="3" fill="oklch(0.42 0.12 185 / 0.18)" />
          <rect x="172" y="88" width="56" height="6" rx="3" fill="oklch(0.42 0.12 185 / 0.12)" />
          <rect
            x="172"
            y="108"
            width="52"
            height="18"
            rx="9"
            fill="oklch(0.48 0.12 185 / 0.1)"
            stroke="oklch(0.48 0.12 185 / 0.35)"
          />
          <text
            x="198"
            y="120"
            textAnchor="middle"
            fill="oklch(0.38 0.1 190)"
            fontSize="8"
            fontWeight="700"
          >
            AI explained
          </text>
          <path
            className="ai-explained__spark"
            d="M236 48l2 6.2L244.2 54l-6.2 2L236 62.2l-2-6.2L227.8 54l6.2-2L236 48z"
            fill="oklch(0.72 0.09 85)"
          />
        </g>
        <rect
          className="ai-explained__bar"
          x="48"
          y="160"
          width="96"
          height="10"
          rx="5"
          fill="oklch(0.62 0.11 165 / 0.25)"
        />
        <rect
          className="ai-explained__bar-fill"
          x="48"
          y="160"
          width="72"
          height="10"
          rx="5"
          fill="oklch(0.55 0.1 170)"
        />
      </g>
    </svg>
  );
}
