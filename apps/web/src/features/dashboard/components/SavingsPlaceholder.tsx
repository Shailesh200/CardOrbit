import { TrendingUp } from 'lucide-react';

type Props = {
  spendBand?: string | null;
};

const SPEND_BAND_COPY: Record<string, string> = {
  UNDER_10K: 'Based on your monthly spend band, we surface smaller-ticket recommendations first.',
  '10K_50K': 'Your spend profile favors everyday merchants — check quick picks below.',
  '50K_PLUS': 'High-spend optimization starts with using the right card on every purchase.',
};

/** Estimated savings — placeholder until reward wallet ships (M-035). */
export function SavingsPlaceholder({ spendBand }: Props) {
  const hint =
    (spendBand && SPEND_BAND_COPY[spendBand]) ??
    'Reward tracking starts once you add cards and use recommendations at checkout.';

  return (
    <section
      className="dashboard-savings flex h-full flex-col justify-between rounded-2xl border border-border/60 bg-background/60 p-5"
      aria-label="Estimated savings summary"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Estimated savings
          </p>
          <p className="font-display text-3xl font-semibold tracking-tight text-muted-foreground">
            —
          </p>
        </div>
        <span className="rounded-xl bg-primary/10 p-2 text-primary" aria-hidden>
          <TrendingUp className="size-5" />
        </span>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{hint}</p>
    </section>
  );
}
