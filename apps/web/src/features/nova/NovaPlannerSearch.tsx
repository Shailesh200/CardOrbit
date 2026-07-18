import { FormEvent, useState } from 'react';
import { Button, Input, cn } from '@cardwise/ui';
import { Orbit, Sparkles } from 'lucide-react';

import { useAiFeatures } from '../ai/use-ai-features';
import { openNova } from './nova-events';

const SUGGESTIONS = [
  'Plan an itinerary for Delhi with the best cards for flights and hotels',
  'Which card should I use for international travel this month?',
  'Best card for weekend dining in Mumbai under ₹3,000',
  'Compare lounge access across my portfolio cards',
];

export function NovaPlannerSearch() {
  const { assistant } = useAiFeatures();
  const [query, setQuery] = useState('');

  if (!assistant) return null;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      openNova();
      return;
    }
    openNova(trimmed);
  }

  return (
    <section
      className="nova-planner rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.08] via-background/80 to-transparent p-4 sm:p-5"
      aria-label="Nova planner"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Orbit className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-base font-semibold tracking-tight">Nova</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="size-2.5" aria-hidden />
              Orbit planner
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Plan trips, pick the right card for flights, hotels, and everyday spend.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Try: plan an itinerary for Delhi…"
          aria-label="Ask Nova"
          className="h-11 flex-1 border-primary/25 bg-background shadow-sm"
        />
        <Button type="submit" className="btn-premium h-11 shrink-0">
          Ask Nova
        </Button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            className={cn(
              'rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-left text-[11px] text-muted-foreground transition',
              'hover:border-primary/30 hover:bg-primary/5 hover:text-foreground',
            )}
            onClick={() => openNova(suggestion)}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </section>
  );
}
