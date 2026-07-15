import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@cardwise/ui';
import { Settings2 } from 'lucide-react';

import {
  DASHBOARD_WIDGET_LABELS,
  updateDashboardPreferences,
  type DashboardPreferences,
  type DashboardWidgetId,
} from '../dashboard-api';
import { toast } from '../../../lib/app-toast';

type Props = {
  preferences: DashboardPreferences;
  availableWidgets: DashboardWidgetId[];
  onUpdated: (preferences: DashboardPreferences) => void;
};

export function DashboardCustomizePanel({ preferences, availableWidgets, onUpdated }: Props) {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState<Set<DashboardWidgetId>>(
    () => new Set(preferences.hiddenWidgets),
  );
  const [saving, setSaving] = useState(false);

  function toggleWidget(id: DashboardWidgetId) {
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onSave() {
    setSaving(true);
    try {
      const updated = await updateDashboardPreferences({
        hiddenWidgets: [...hidden],
      });
      onUpdated(updated);
      setOpen(false);
      toast.success('Homepage layout updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save homepage layout');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Settings2 className="size-4" />
        Customize
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Customize homepage</DialogTitle>
            <DialogDescription>
              Choose which sections appear on your personalized home. Changes sync across devices.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2">
            {availableWidgets.map((id) => (
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="btn-premium" disabled={saving} onClick={onSave}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
