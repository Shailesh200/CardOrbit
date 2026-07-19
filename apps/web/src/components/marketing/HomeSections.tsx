import { Button } from '@cardwise/ui';
import { ArrowRight, Brain, Lock, Sparkles } from 'lucide-react';

import { ConsumerDarkPanel } from '@/components/surface/ConsumerDarkPanel';
import { AppOriginLink } from '@/components/navigation/AppOriginLink';
import { RevealOnScroll } from '@motion/RevealOnScroll';

const benefits = [
  {
    icon: Sparkles,
    title: 'AI-explained recommendations',
    body: 'Deterministic reward math first — then a grounded AI summary of why your card wins.',
  },
  {
    icon: Brain,
    title: 'Semantic search',
    body: 'Find merchants and cards by name, category, or keywords like "dining cashback" or "0% forex".',
  },
  {
    icon: Lock,
    title: 'Privacy by default',
    body: 'Your portfolio stays yours. No selling spend data to advertisers.',
  },
];

export function HomeBenefits() {
  return (
    <section className="home-benefits mx-auto max-w-6xl px-4 py-16 lg:py-20">
      <RevealOnScroll className="mb-10 max-w-2xl space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Why CardOrbit
        </p>
        <h2 className="font-display text-[2rem] font-semibold leading-tight tracking-tight sm:text-[2.5rem]">
          Your intelligent financial command center
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
          Optimize every payment across cards, rewards, offers, and travel. CardOrbit keeps your
          financial orbit in alignment — calmly, precisely, automatically.
        </p>
      </RevealOnScroll>

      <div className="grid gap-5 sm:grid-cols-3">
        {benefits.map(({ icon: Icon, title, body }, index) => (
          <RevealOnScroll key={title} delay={index * 90}>
            <article className="home-benefit-card consumer-surface consumer-surface--glass h-full p-6">
              <span className="home-benefit-icon mb-5 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <h3 className="font-display text-xl font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </article>
          </RevealOnScroll>
        ))}
      </div>
    </section>
  );
}

export function HomeCtaBand() {
  return (
    <section className="home-cta-band mx-4 mb-16 lg:mx-auto lg:max-w-6xl">
      <RevealOnScroll>
        <ConsumerDarkPanel className="px-6 py-12 sm:px-10 sm:py-14">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300/80">
              Enter your orbit
            </p>
            <h2 className="font-display mt-3 text-[1.85rem] font-semibold leading-tight text-white sm:text-[2.35rem]">
              Ready to <span className="consumer-dark-accent">optimize every payment?</span>
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-white/65 sm:text-base">
              Join India&apos;s AI-powered financial operating system. Intelligent recommendations,
              rewards optimization, and a calm command center — free to start.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="home-btn-primary">
                <AppOriginLink
                  to="/signup"
                  marketingCta={{ placement: 'below_fold', cta: 'enter_your_orbit' }}
                >
                  Enter your orbit
                  <ArrowRight className="size-4" />
                </AppOriginLink>
              </Button>
              <Button asChild size="lg" variant="outline" className="home-btn-secondary">
                <AppOriginLink
                  to="/login"
                  marketingCta={{ placement: 'below_fold', cta: 'sign_in' }}
                >
                  Sign in
                </AppOriginLink>
              </Button>
            </div>
          </div>
        </ConsumerDarkPanel>
      </RevealOnScroll>
    </section>
  );
}
