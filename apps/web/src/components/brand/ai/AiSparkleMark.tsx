type Props = {
  className?: string;
};

/** Compact four-point sparkle mark for badges, hints, and inline AI affordances. */
export function AiSparkleMark({ className }: Props) {
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        className="ai-sparkle-mark__star"
        d="M12 2.5l1.4 4.6L18 8.5l-4.6 1.4L12 14.5l-1.4-4.6L6 8.5l4.6-1.4L12 2.5z"
        fill="currentColor"
      />
      <circle
        className="ai-sparkle-mark__dot ai-sparkle-mark__dot--a"
        cx="19"
        cy="5"
        r="1.25"
        fill="currentColor"
      />
      <circle
        className="ai-sparkle-mark__dot ai-sparkle-mark__dot--b"
        cx="5"
        cy="17"
        r="1"
        fill="currentColor"
      />
    </svg>
  );
}
