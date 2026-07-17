import { ANALYTICS_EVENT_CATALOG } from '@cardwise/analytics/catalog';

const CATEGORY_LABELS: Record<string, string> = {
  user: 'User',
  recommendation: 'Recommendation',
  merchant: 'Merchant',
  card: 'Card',
  extension: 'Extension',
  dashboard: 'Dashboard',
  experiment: 'Experiment',
};

export function AnalyticsEventsPage() {
  const grouped = ANALYTICS_EVENT_CATALOG.reduce<Record<string, typeof ANALYTICS_EVENT_CATALOG>>(
    (acc, entry) => {
      const list = acc[entry.category] ?? [];
      list.push(entry);
      acc[entry.category] = list;
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Analytics events</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Typed product event catalog from <code className="text-xs">@cardwise/analytics</code>.
          Feature code must emit only these events — never call PostHog directly.
        </p>
      </div>

      {Object.entries(grouped).map(([category, entries]) => (
        <section key={category} className="space-y-3">
          <h2 className="text-lg font-semibold">{CATEGORY_LABELS[category] ?? category}</h2>
          <div className="overflow-hidden rounded-2xl border border-border/60">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Phase</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Key properties</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.event} className="border-t border-border/50 align-top">
                    <td className="px-4 py-3 font-mono text-xs">{entry.event}</td>
                    <td className="px-4 py-3 tabular-nums">{entry.phase}</td>
                    <td className="px-4 py-3 text-muted-foreground">{entry.description}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {entry.keyProperties.join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
