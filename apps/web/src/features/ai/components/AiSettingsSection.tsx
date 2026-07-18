import { Link } from 'react-router';
import { Bot, Brain, Search } from 'lucide-react';

import { useAiFeatures } from '../use-ai-features';
import { AiBadge } from './AiBadge';
import { AiVisual } from './AiVisual';

const CAPABILITIES = [
  {
    key: 'search',
    icon: Search,
    title: 'Nova search',
    body: 'Find merchants and cards by name, category, or natural keywords like "dining cashback".',
    href: '/account/merchants',
    cta: 'Try merchant search',
  },
  {
    key: 'explanations',
    icon: Brain,
    title: 'AI-explained picks',
    body: 'Best-card recommendations show computed reward math first, then a grounded summary of why it wins.',
    href: '/account/merchants',
    cta: 'See a recommendation',
  },
  {
    key: 'assistant',
    icon: Bot,
    title: 'Nova planner',
    body: 'Use the dashboard Nova search bar or floating button to plan trips, pick cards, and explore your portfolio — citations included, no auto-actions.',
  },
] as const;

export function AiSettingsSection() {
  const ai = useAiFeatures();

  if (!ai.anyEnabled) {
    return (
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <AiVisual variant="orb" className="shrink-0" illustrationClassName="h-20 w-24" />
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">AI features</h2>
            <p className="max-w-lg text-sm text-muted-foreground">
              CardOrbit is built AI-native with Nova: semantic search, grounded explanations, and a
              read-only planner. Capabilities are managed by your CardOrbit administrator and appear
              here when enabled.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start gap-4">
        <AiVisual
          variant="orb"
          motion="lottie"
          className="shrink-0"
          illustrationClassName="h-24 w-28"
        />
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">AI features</h2>
            <AiBadge variant="native" showIcon={false} />
          </div>
          <p className="max-w-lg text-sm text-muted-foreground">
            Rewards are always computed by CardOrbit rules. AI helps you search, understand picks,
            and ask questions — never to invent rates or fees.
          </p>
        </div>
      </div>

      <ul className="grid max-w-2xl gap-3">
        {CAPABILITIES.map((capability) => {
          const { key, icon: Icon, title, body } = capability;
          const href = 'href' in capability ? capability.href : undefined;
          const cta = 'cta' in capability ? capability.cta : undefined;
          const enabled =
            key === 'search' ? ai.search : key === 'explanations' ? ai.explanations : ai.assistant;
          if (!enabled) return null;

          const visualVariant =
            key === 'search' ? 'search' : key === 'explanations' ? 'explained' : 'assistant';

          return (
            <li key={key} className="flex gap-3 rounded-xl border border-border/60 bg-muted/20 p-4">
              <AiVisual
                variant={visualVariant}
                motion={key === 'assistant' ? 'lottie' : 'static'}
                className="shrink-0"
                illustrationClassName="h-16 w-20"
              />
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{title}</p>
                  <Icon className="size-3.5 text-primary" aria-hidden />
                </div>
                <p className="text-sm text-muted-foreground">{body}</p>
                {href && cta ? (
                  <Link
                    to={href}
                    className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {cta}
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {ai.insights ? (
        <p className="text-xs text-muted-foreground">
          Dashboard insights may include AI-generated summaries grounded in your portfolio and spend
          preferences.
        </p>
      ) : null}
    </section>
  );
}
