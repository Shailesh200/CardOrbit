import { ArrowRight } from 'lucide-react';
import { Button } from '@cardwise/ui';

import { AppOriginLink } from '@/components/navigation/AppOriginLink';
import { RevealOnScroll } from '@motion/RevealOnScroll';
import { AiVisual } from '@features/ai/components/AiVisual';

const capabilities = [
  {
    variant: 'explained' as const,
    title: 'AI-explained recommendations',
    body: 'Every best-card pick shows clear reward math first, then a grounded AI summary of why it wins.',
  },
  {
    variant: 'search' as const,
    title: 'Search by keywords or meaning',
    body: 'Find merchants and cards with names, categories, or phrases like "0% forex" or "dining cashback".',
  },
  {
    variant: 'assistant' as const,
    title: 'Read-only AI assistant',
    body: 'Ask which card to use, compare benefits, or explore your portfolio — citations included, no auto-actions.',
  },
];

export function HomeAiSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 lg:py-20">
      <div className="mb-10 grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(220px,320px)]">
        <RevealOnScroll className="max-w-2xl space-y-3">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <AiVisual variant="mark" className="size-3.5" />
            AI-first operating system
          </p>
          <h2 className="font-display text-[2rem] font-semibold leading-tight tracking-tight sm:text-[2.5rem]">
            Intelligence you can trust — not guesswork
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
            CardOrbit is built for India with a deterministic rewards engine at the core. AI layers
            on top to structure catalog data, explain picks in plain language, and power semantic
            search — never to invent cashback rates or fees.
          </p>
        </RevealOnScroll>

        <RevealOnScroll delay={120} className="mx-auto w-full max-w-xs lg:max-w-none">
          <AiVisual
            variant="orb"
            motion="lottie"
            className="w-full"
            illustrationClassName="h-auto w-full max-h-[240px]"
          />
        </RevealOnScroll>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {capabilities.map(({ variant, title, body }, index) => (
          <RevealOnScroll key={title} delay={index * 90}>
            <article className="home-benefit-card consumer-surface consumer-surface--glass h-full p-6">
              <AiVisual
                variant={variant}
                motion={variant === 'assistant' ? 'lottie' : 'static'}
                className="mb-5"
                illustrationClassName="h-24 w-full max-w-[11rem]"
              />
              <h3 className="font-display text-xl font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </article>
          </RevealOnScroll>
        ))}
      </div>

      <RevealOnScroll className="mt-10 flex flex-wrap items-center gap-3">
        <Button asChild size="lg" className="btn-premium">
          <AppOriginLink to="/signup">
            Enter CardOrbit
            <ArrowRight className="size-4" />
          </AppOriginLink>
        </Button>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <img src="/assets/ai/ai-sparkle-mark.svg" alt="" className="size-5" aria-hidden />
          Optimized rewards · AI explanations · Sources cited
        </p>
      </RevealOnScroll>
    </section>
  );
}
