import { Link } from 'react-router';

import { useAiFeatures } from '../use-ai-features';
import { AiBadge } from './AiBadge';
import { AiVisual } from './AiVisual';

export function AiNativeStrip() {
  const ai = useAiFeatures();

  if (!ai.anyEnabled) return null;

  return (
    <section
      className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.06] to-transparent p-4 sm:p-5"
      aria-label="AI capabilities"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <AiVisual variant="mark" className="size-4" />
            <h2 className="font-display text-sm font-semibold tracking-tight">Powered by Nova</h2>
            <AiBadge variant="native" showIcon={false} />
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Rewards math is always computed by CardOrbit rules. Nova helps you plan trips, search,
            understand picks, and ask questions — with sources cited, never invented rates.
          </p>
        </div>

        <AiVisual
          variant="orb"
          motion="lottie"
          className="hidden shrink-0 sm:block"
          illustrationClassName="h-24 w-28"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {ai.search ? (
          <Link
            to="/account/merchants"
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-background/80 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
          >
            <img src="/assets/ai/ai-search-mark.svg" alt="" className="size-3.5" aria-hidden />
            AI search merchants
          </Link>
        ) : null}
        {ai.assistant ? (
          <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-background/80 px-3 py-1.5 text-xs font-medium text-primary">
            <img src="/assets/ai/ai-assistant-mark.svg" alt="" className="size-3.5" aria-hidden />
            Ask Nova from the search bar or floating button
          </p>
        ) : null}
        {ai.explanations ? (
          <Link
            to="/account/merchants"
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/40"
          >
            <img src="/assets/ai/ai-explained-mark.svg" alt="" className="size-3.5" aria-hidden />
            See AI-explained picks
          </Link>
        ) : null}
      </div>
    </section>
  );
}
