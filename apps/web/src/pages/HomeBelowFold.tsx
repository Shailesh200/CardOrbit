import { RevealOnScroll } from '@motion/RevealOnScroll';
import { HomeBenefits, HomeCtaBand } from '@marketing/HomeSections';
import { HomeAiSection } from '@marketing/HomeAiSection';
import { AiVisual, type AiVisualVariant } from '@features/ai/components/AiVisual';
import { CardStackIllustration } from '@brand/CardStackIllustration';

const steps: Array<{
  visual: AiVisualVariant | 'cards';
  title: string;
  body: string;
}> = [
  {
    visual: 'cards',
    title: 'Add your cards',
    body: 'Build your portfolio — AI uses it to personalize search, picks, and assistant answers.',
  },
  {
    visual: 'search',
    title: 'Search with keywords or meaning',
    body: 'Find merchants by name or phrases like "food delivery". Browse cards with "0% forex" or bank names.',
  },
  {
    visual: 'explained',
    title: 'Get AI-explained picks',
    body: 'See which card wins with computed reward math, then a grounded AI summary of why.',
  },
  {
    visual: 'assistant',
    title: 'Ask the assistant',
    body: 'Chat read-only: which card for Swiggy, portfolio questions, or catalog benefits — sources cited.',
  },
];

export function HomeBelowFold() {
  return (
    <div className="home-light relative bg-background">
      <section className="mx-auto max-w-6xl px-4 pb-8 pt-16 lg:pb-12 lg:pt-20">
        <RevealOnScroll className="mb-10 space-y-2 text-center lg:text-left">
          <p className="inline-flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary lg:justify-start">
            <AiVisual variant="mark" className="size-3.5" />
            How it works
          </p>
          <h2 className="font-display text-[2rem] font-semibold tracking-tight sm:text-[2.35rem]">
            Four steps to financial alignment
          </h2>
          <p className="text-muted-foreground">
            From setup to optimized payments and AI-guided decisions.
          </p>
        </RevealOnScroll>

        <div className="home-steps-grid relative grid gap-6 sm:grid-cols-2 lg:grid-cols-4 sm:gap-5">
          <div className="home-step-connector" aria-hidden />
          {steps.map(({ visual, title, body }, index) => (
            <RevealOnScroll key={title} delay={index * 100}>
              <article className="home-step-card consumer-surface consumer-surface--glass h-full p-6 text-center sm:text-left">
                <div className="mb-5 flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {visual === 'cards' ? (
                    <CardStackIllustration className="h-14 w-20" />
                  ) : (
                    <AiVisual
                      variant={visual}
                      motion={visual === 'assistant' ? 'lottie' : 'static'}
                      illustrationClassName="h-14 w-20"
                    />
                  )}
                  <span className="font-display text-sm font-medium text-muted-foreground/70">
                    Step 0{index + 1}
                  </span>
                </div>
                <h3 className="font-display text-xl font-semibold tracking-tight">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </article>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      <HomeAiSection />
      <HomeBenefits />
      <HomeCtaBand />
    </div>
  );
}
