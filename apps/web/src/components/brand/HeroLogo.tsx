import { Link } from 'react-router';
import { cn } from '@cardwise/ui';

import { HeroLogoMark } from '@brand/HeroLogoMark';

type HeroLogoProps = {
  /** `dark` for hero/auth rail; `light` for nav and app chrome. */
  tone?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
  /** When false, render static brand (e.g. footer) without link wrapper. */
  linked?: boolean;
  /** Home route when linked (default `/`). */
  homeTo?: string;
};

const markSize = {
  sm: 'size-9',
  md: 'size-11',
  lg: 'size-12 sm:size-[3.25rem]',
} as const;

const wordSize = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-[1.65rem] sm:text-[1.9rem]',
} as const;

export function HeroLogo({
  tone = 'light',
  size = 'md',
  showTagline = false,
  className,
  linked = true,
  homeTo = '/',
}: HeroLogoProps) {
  const dark = tone === 'dark';

  const content = (
    <>
      <HeroLogoMark className={markSize[size]} idSuffix={size} />
      <span className="flex flex-col gap-0.5">
        <span
          className={cn(
            'font-display font-semibold leading-none tracking-[-0.045em]',
            wordSize[size],
            dark ? 'text-white' : 'text-foreground',
          )}
        >
          CardOrbit
        </span>
        {showTagline ? (
          <span
            className={cn(
              'text-[0.62rem] font-semibold uppercase tracking-[0.22em]',
              dark ? 'text-white/45' : 'text-muted-foreground',
            )}
          >
            Your AI-powered financial orbit
          </span>
        ) : null}
      </span>
    </>
  );

  const shellClass = cn(
    'inline-flex items-center gap-2.5 rounded-lg sm:gap-3',
    linked && 'home-hero-logo group outline-none focus-visible:ring-[3px]',
    linked && (dark ? 'focus-visible:ring-white/30' : 'focus-visible:ring-ring/50'),
    className,
  );

  if (!linked) {
    return <span className={shellClass}>{content}</span>;
  }

  // Absolute origins (e.g. https://cardorbit.in) must use <a>, not React Router.
  if (/^https?:\/\//i.test(homeTo)) {
    return (
      <a href={homeTo} className={shellClass}>
        {content}
      </a>
    );
  }

  return (
    <Link to={homeTo} className={shellClass}>
      {content}
    </Link>
  );
}
