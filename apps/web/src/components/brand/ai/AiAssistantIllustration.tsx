type Props = {
  className?: string;
};

/** Read-only assistant — chat bubbles with citation chip. */
export function AiAssistantIllustration({ className }: Props) {
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
          id="ai-assist-bot"
          x1="72"
          y1="48"
          x2="168"
          y2="144"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="oklch(0.48 0.12 185)" />
          <stop offset="1" stopColor="oklch(0.32 0.1 200)" />
        </linearGradient>
        <filter id="ai-assist-shadow" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="oklch(0.2 0.04 250 / 0.2)" />
        </filter>
      </defs>
      <ellipse cx="140" cy="196" rx="88" ry="10" fill="oklch(0.22 0.04 250 / 0.1)" />
      <g filter="url(#ai-assist-shadow)">
        <rect x="52" y="40" width="176" height="128" rx="28" fill="url(#ai-assist-bot)" />
        <circle cx="96" cy="88" r="8" fill="white" opacity="0.9" />
        <circle cx="128" cy="88" r="8" fill="white" opacity="0.9" />
        <rect x="84" y="108" width="72" height="8" rx="4" fill="white" opacity="0.35" />
        <rect x="84" y="124" width="96" height="8" rx="4" fill="white" opacity="0.25" />
        <path
          className="ai-assist__spark"
          d="M196 52l2.8 8.6L207.4 64l-8.6 2.8L196 75.4l-2.8-8.6L184.6 64l8.6-2.8L196 52z"
          fill="oklch(0.72 0.09 85)"
        />
        <g className="ai-assist__bubble ai-assist__bubble--user">
          <rect
            x="148"
            y="118"
            width="96"
            height="36"
            rx="18"
            fill="oklch(0.96 0.01 185 / 0.95)"
            stroke="oklch(0.42 0.12 185 / 0.2)"
          />
          <rect x="164" y="132" width="64" height="8" rx="4" fill="oklch(0.42 0.12 185 / 0.35)" />
        </g>
        <g className="ai-assist__bubble ai-assist__bubble--reply">
          <rect
            x="36"
            y="148"
            width="128"
            height="44"
            rx="18"
            fill="white"
            stroke="oklch(0.42 0.12 185 / 0.18)"
          />
          <rect x="52" y="162" width="72" height="6" rx="3" fill="oklch(0.42 0.12 185 / 0.25)" />
          <rect x="52" y="174" width="48" height="6" rx="3" fill="oklch(0.42 0.12 185 / 0.15)" />
          <rect
            x="108"
            y="172"
            width="40"
            height="14"
            rx="7"
            fill="oklch(0.48 0.12 185 / 0.12)"
            stroke="oklch(0.48 0.12 185 / 0.3)"
          />
          <text
            x="128"
            y="182"
            textAnchor="middle"
            fill="oklch(0.38 0.1 190)"
            fontSize="7"
            fontWeight="700"
          >
            cited
          </text>
        </g>
      </g>
    </svg>
  );
}
