import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@cardwise/ui';

import { HeroLogo } from '@brand/HeroLogo';
import { AiSparkleMark } from '@brand/ai/AiSparkleMark';
import { HeroAmbientBackground } from '@marketing/HeroAmbientBackground';
import { RecommendationPreview } from '@marketing/RecommendationPreview';
import { TrustStrip } from '@marketing/TrustStrip';

import './home.css';

const HomeBelowFold = lazy(() =>
  import('./HomeBelowFold').then((m) => ({ default: m.HomeBelowFold })),
);
const HomeHeroShowcase = lazy(() =>
  import('@marketing/HomeHeroShowcase').then((m) => ({ default: m.HomeHeroShowcase })),
);

function readIsLargeScreen(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(min-width: 1024px)').matches;
}

export function HomePage() {
  const [isLargeScreen, setIsLargeScreen] = useState(readIsLargeScreen);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const sync = () => setIsLargeScreen(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  return (
    <div className="home-page">
      <section className="home-hero relative min-h-[calc(100dvh-var(--shell-header-height))] overflow-hidden">
        <HeroAmbientBackground />

        <div className="home-hero__content relative z-[1] mx-auto grid min-h-[calc(100dvh-var(--shell-header-height))] w-full max-w-6xl grid-cols-1 content-center gap-8 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.85fr)] lg:items-center lg:gap-10 lg:pb-20 lg:pt-14">
          <div className="home-hero-copy flex w-full max-w-none flex-col justify-center space-y-8 lg:min-w-0 lg:space-y-9">
            <HeroLogo size="lg" tone="dark" showTagline />

            <div className="space-y-6">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/80">
                <AiSparkleMark className="size-3.5 text-white/90" />
                AI financial OS · India
              </p>
              <h1 className="home-headline font-display text-[2.5rem] font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-[3.35rem] lg:text-[3.55rem] xl:text-[3.75rem]">
                <span className="headline-lines block">
                  <span>Your AI-powered </span>
                  <span>
                    financial <em className="home-headline-accent not-italic">orbit.</em>
                  </span>
                </span>
              </h1>
              <p className="home-subcopy max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
                Optimize every payment across cards, rewards, offers, and travel — intelligent
                recommendations, explained clearly, with AI that keeps your finances in alignment.
              </p>
            </div>

            <TrustStrip variant="dark" />

            <div className="home-hero-ctas flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="home-btn-primary">
                <Link to="/signup">Enter your orbit</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="home-btn-secondary">
                <Link to="/login">Sign in</Link>
              </Button>
            </div>

            <dl className="home-hero-stats grid max-w-lg grid-cols-3 gap-4 border-t border-white/10 pt-6 sm:gap-6">
              <div>
                <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-white/45">
                  Payments
                </dt>
                <dd className="font-display mt-1 text-xl font-semibold text-white">Optimized</dd>
              </div>
              <div>
                <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-white/45">
                  Rewards
                </dt>
                <dd className="font-display mt-1 text-xl font-semibold text-white">Maximized</dd>
              </div>
              <div>
                <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-white/45">
                  Intelligence
                </dt>
                <dd className="font-display mt-1 text-xl font-semibold text-white">AI-first</dd>
              </div>
            </dl>
          </div>

          <Suspense
            fallback={
              <div className="home-hero-showcase relative flex w-full flex-col justify-center gap-2">
                <RecommendationPreview compact />
              </div>
            }
          >
            <HomeHeroShowcase showCardStack={isLargeScreen} />
          </Suspense>
        </div>
      </section>

      <Suspense fallback={<div className="home-light min-h-[32rem] bg-background" aria-hidden />}>
        <HomeBelowFold />
      </Suspense>
    </div>
  );
}
