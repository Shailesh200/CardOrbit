import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { MapPin, Plane } from 'lucide-react';

import { PageBackLink } from '@layout/PageBackLink';
import { notify } from '@lib/app-toast';
import {
  createTripPlan,
  formatInr,
  trackTripPlannerViewed,
  type TripPlanInput,
  type TripPlanResult,
} from './trip-planner-api';

function defaultStartDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date.toISOString().slice(0, 10);
}

function defaultEndDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 17);
  return date.toISOString().slice(0, 10);
}

function CategoryRecommendation({ row }: { row: TripPlanResult['recommendedCards'][number] }) {
  const pick = row.recommendedCard;
  return (
    <article className="space-y-3 rounded-2xl border border-border/60 bg-background/50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {row.categoryLabel}
          </p>
          <p className="text-sm text-muted-foreground">
            Planned spend {formatInr(row.spendAmountInr)}
          </p>
        </div>
        {pick ? (
          <div className="text-right">
            <p className="font-semibold text-primary">{formatInr(pick.expectedRewardInr)}</p>
            <p className="text-xs text-muted-foreground">
              {pick.estimatedPoints.toLocaleString('en-IN')} pts ·{' '}
              {pick.effectiveRatePercent.toFixed(2)}%
            </p>
          </div>
        ) : null}
      </div>

      {pick ? (
        <div className="space-y-1">
          <p className="font-semibold">{pick.cardName}</p>
          <p className="text-sm text-muted-foreground">{pick.bankName}</p>
          <p className="text-sm text-muted-foreground">{pick.rationale}</p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No strong card found for this category.</p>
      )}

      {row.alternatives.length > 0 ? (
        <ul className="space-y-1 border-t border-border/50 pt-3 text-sm text-muted-foreground">
          {row.alternatives.map((alt) => (
            <li key={alt.userCardId}>
              {alt.cardName} — {formatInr(alt.expectedRewardInr)} (
              {alt.effectiveRatePercent.toFixed(2)}%)
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

export function TripPlannerPage() {
  const [form, setForm] = useState<TripPlanInput>({
    destination: '',
    startDate: defaultStartDate(),
    endDate: defaultEndDate(),
    budgetInr: 100_000,
    preferredAirline: '',
    preferredHotel: '',
  });
  const [plan, setPlan] = useState<TripPlanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    document.title = 'CardOrbit · Trip planner';
    void trackTripPlannerViewed().catch(() => undefined);
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setLoading(true);

    try {
      const payload: TripPlanInput = {
        destination: form.destination.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        budgetInr: Number(form.budgetInr),
        ...(form.preferredAirline?.trim()
          ? { preferredAirline: form.preferredAirline.trim() }
          : {}),
        ...(form.preferredHotel?.trim() ? { preferredHotel: form.preferredHotel.trim() } : {}),
      };
      const result = await createTripPlan(payload);
      setPlan(result);
    } catch (error) {
      notify.fromError(error, 'Could not create trip plan');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageBackLink to="/account/travel" label="Travel hub" />

      <header className="flex items-start gap-3">
        <span className="rounded-xl bg-primary/10 p-2 text-primary" aria-hidden>
          <MapPin className="size-5" />
        </span>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Trip planner
          </p>
          <h1 className="consumer-page-heading font-display text-2xl font-semibold tracking-tight">
            Plan a trip with card-aware recommendations
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter destination, dates, and budget to see which cards to use for flights, hotels,
            dining, and transport — plus lounge access and reward opportunities.
          </p>
        </div>
      </header>

      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="grid gap-4 rounded-2xl border border-border/60 bg-background/50 p-5 md:grid-cols-2"
      >
        <label className="space-y-1 md:col-span-2">
          <span className="text-sm font-medium">Destination</span>
          <input
            required
            value={form.destination}
            onChange={(event) => setForm((prev) => ({ ...prev, destination: event.target.value }))}
            placeholder="Goa, Dubai, Singapore…"
            className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium">Start date</span>
          <input
            required
            type="date"
            value={form.startDate}
            onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
            className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium">End date</span>
          <input
            required
            type="date"
            value={form.endDate}
            min={form.startDate}
            onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
            className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium">Estimated budget (INR)</span>
          <input
            required
            type="number"
            min={1000}
            step={1000}
            value={form.budgetInr}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, budgetInr: Number(event.target.value) }))
            }
            className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium">Preferred airline (optional)</span>
          <input
            value={form.preferredAirline ?? ''}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, preferredAirline: event.target.value }))
            }
            placeholder="IndiGo, Air India…"
            className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm"
          />
        </label>

        <label className="space-y-1 md:col-span-2">
          <span className="text-sm font-medium">Preferred hotel chain (optional)</span>
          <input
            value={form.preferredHotel ?? ''}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, preferredHotel: event.target.value }))
            }
            placeholder="Marriott, ITC, Taj…"
            className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm"
          />
        </label>

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            <Plane className="size-4" aria-hidden />
            {loading ? 'Planning…' : 'Create trip plan'}
          </button>
        </div>
      </form>

      {submitted && !loading && !plan ? (
        <p className="text-sm text-muted-foreground">Fix the form and try again.</p>
      ) : null}

      {plan ? (
        <>
          <section className="rounded-2xl border border-border/60 bg-background/50 p-5">
            <h2 className="font-semibold">Trip summary</h2>
            <p className="mt-2 text-sm text-muted-foreground">{plan.summary}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Trip length</p>
                <p className="font-semibold">{plan.tripDays} days</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Scope</p>
                <p className="font-semibold capitalize">{plan.scope.toLowerCase()}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Est. rewards
                </p>
                <p className="font-semibold text-primary">
                  {formatInr(plan.totalEstimatedValueInr)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Est. points</p>
                <p className="font-semibold">{plan.totalEstimatedPoints.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-semibold">Recommended cards by category</h2>
            <div className="grid gap-4 lg:grid-cols-2">
              {plan.recommendedCards.map((row) => (
                <CategoryRecommendation key={row.category} row={row} />
              ))}
            </div>
          </section>

          {plan.loungeEligibility.length > 0 ? (
            <section className="space-y-3">
              <h2 className="font-semibold">Lounge eligibility</h2>
              <ul className="space-y-2">
                {plan.loungeEligibility.map((row) => (
                  <li
                    key={row.userCardId}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border/50 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">{row.cardName}</p>
                      <p className="text-sm text-muted-foreground">{row.scopeNote}</p>
                      {row.loungeSummary ? (
                        <p className="text-xs text-muted-foreground">{row.loungeSummary}</p>
                      ) : null}
                    </div>
                    <span
                      className={
                        row.eligible
                          ? 'text-xs font-semibold text-emerald-700 dark:text-emerald-300'
                          : 'text-xs font-semibold text-muted-foreground'
                      }
                    >
                      {row.eligible ? 'Likely eligible' : 'Unlikely'}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {plan.rewardOpportunities.length > 0 ? (
            <section className="space-y-3">
              <h2 className="font-semibold">Reward opportunities</h2>
              <ul className="space-y-3">
                {plan.rewardOpportunities.map((row) => (
                  <li
                    key={`${row.kind}-${row.priorityRank}`}
                    className="rounded-xl border border-border/50 px-4 py-3"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                      {row.kind}
                    </p>
                    <p className="font-medium">{row.title}</p>
                    <p className="text-sm text-muted-foreground">{row.description}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {plan.travelBenefits.length > 0 ? (
            <section className="space-y-3">
              <h2 className="font-semibold">Travel benefits</h2>
              <ul className="space-y-2 text-sm">
                {plan.travelBenefits.map((row, index) => (
                  <li
                    key={`${row.userCardId}-${index}`}
                    className="rounded-xl border border-border/50 px-4 py-3"
                  >
                    <p className="font-medium">
                      {row.title} · {row.cardName}
                    </p>
                    {row.description ? (
                      <p className="text-muted-foreground">{row.description}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="flex flex-col gap-1">
            <Link
              to="/account/travel/booking"
              className="inline-flex text-sm font-medium text-primary hover:underline"
            >
              Search bookings with effective-cost ranking →
            </Link>
            <Link
              to="/account/redemptions"
              className="inline-flex text-sm font-medium text-primary hover:underline"
            >
              Compare flight & hotel redemptions →
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
