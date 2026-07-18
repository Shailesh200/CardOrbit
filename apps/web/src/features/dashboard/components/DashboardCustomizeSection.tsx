import { useEffect, useState } from 'react';
import { Button } from '@cardwise/ui';

import {
  DASHBOARD_WIDGET_LABELS,
  getDashboardPreferences,
  updateDashboardPreferences,
  type DashboardWidgetId,
} from '../dashboard-api';
import { notify, toast } from '../../../lib/app-toast';
import { trackDashboardWidgetInteractionClient } from '../../../lib/product-analytics';

export function DashboardCustomizeSection() {
  const [hidden, setHidden] = useState<Set<DashboardWidgetId>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void getDashboardPreferences()
      .then((prefs) => setHidden(new Set(prefs.hiddenWidgets)))
      .catch((error) => {
        toast.error(
          error instanceof Error ? error.message : 'Could not load dashboard preferences',
        );
      })
      .finally(() => setLoading(false));
  }, []);

  function toggleWidget(id: DashboardWidgetId) {
    setHidden((current) => {
      const next = new Set(current);
      const willHide = !next.has(id);
      if (willHide) next.add(id);
      else next.delete(id);
      trackDashboardWidgetInteractionClient({
        widgetId: id,
        action: willHide ? 'hidden' : 'shown',
      });
      return next;
    });
  }

  async function onSave() {
    setSaving(true);
    try {
      await updateDashboardPreferences({ hiddenWidgets: [...hidden] });
      trackDashboardWidgetInteractionClient({ widgetId: 'layout', action: 'customized' });
      toast.success('Homepage layout updated');
    } catch (error) {
      notify.fromError(error, 'Could not save homepage layout');
    } finally {
      setSaving(false);
    }
  }

  const widgetIds = Object.keys(DASHBOARD_WIDGET_LABELS) as DashboardWidgetId[];

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Homepage layout</h2>
        <p className="text-sm text-muted-foreground">
          Choose which sections appear on your personalized home. Changes sync across devices.
        </p>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading dashboard layout…</p>
      ) : (
        <>
          <ul className="space-y-2">
            {widgetIds.map((id) => (
              <li key={id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={!hidden.has(id)}
                    onChange={() => toggleWidget(id)}
                    className="size-4 rounded border-border"
                  />
                  <span className="text-sm">{DASHBOARD_WIDGET_LABELS[id]}</span>
                </label>
              </li>
            ))}
          </ul>
          <Button type="button" className="btn-premium" disabled={saving} onClick={onSave}>
            {saving ? 'Saving…' : 'Save homepage layout'}
          </Button>
        </>
      )}
    </section>
  );
}
