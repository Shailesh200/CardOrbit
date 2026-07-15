import { z } from 'zod';

export const DashboardWidgetIdSchema = z.enum([
  'morning-summary',
  'recommended-actions',
  'expiring-rewards',
  'insights',
  'recommendation',
  'savings',
  'milestones',
  'upcoming-travel',
  'favorite-cards',
  'portfolio',
  'offers',
  'merchants',
  'recent-activity',
]);

export type DashboardWidgetId = z.infer<typeof DashboardWidgetIdSchema>;

export const DEFAULT_DASHBOARD_WIDGET_ORDER: DashboardWidgetId[] = [
  'morning-summary',
  'recommended-actions',
  'expiring-rewards',
  'insights',
  'recommendation',
  'savings',
  'milestones',
  'upcoming-travel',
  'favorite-cards',
  'portfolio',
  'offers',
  'merchants',
  'recent-activity',
];

const KNOWN_WIDGET_IDS = new Set<string>(DashboardWidgetIdSchema.options);

function sanitizeWidgetIds(input: unknown): DashboardWidgetId[] {
  if (!Array.isArray(input)) return [...DEFAULT_DASHBOARD_WIDGET_ORDER];
  return input.filter(
    (id): id is DashboardWidgetId => typeof id === 'string' && KNOWN_WIDGET_IDS.has(id),
  );
}

export const DashboardPreferencesSchema = z.object({
  widgetOrder: z.array(DashboardWidgetIdSchema).default([...DEFAULT_DASHBOARD_WIDGET_ORDER]),
  hiddenWidgets: z.array(DashboardWidgetIdSchema).default([]),
  updatedAt: z.string().datetime().optional(),
});

export type DashboardPreferences = z.infer<typeof DashboardPreferencesSchema>;

export const DEFAULT_DASHBOARD_PREFERENCES: DashboardPreferences = {
  widgetOrder: [...DEFAULT_DASHBOARD_WIDGET_ORDER],
  hiddenWidgets: [],
};

export const UpdateDashboardPreferencesSchema = DashboardPreferencesSchema.pick({
  widgetOrder: true,
  hiddenWidgets: true,
}).partial();

export type UpdateDashboardPreferencesInput = z.infer<typeof UpdateDashboardPreferencesSchema>;

export function parseDashboardPreferences(input: unknown): DashboardPreferences {
  if (!input || typeof input !== 'object') {
    return { ...DEFAULT_DASHBOARD_PREFERENCES };
  }
  const raw = input as Record<string, unknown>;
  return DashboardPreferencesSchema.parse({
    ...DEFAULT_DASHBOARD_PREFERENCES,
    ...raw,
    widgetOrder: sanitizeWidgetIds(raw.widgetOrder ?? DEFAULT_DASHBOARD_WIDGET_ORDER),
    hiddenWidgets: sanitizeWidgetIds(raw.hiddenWidgets ?? []),
  });
}

export function mergeDashboardPreferences(
  current: unknown,
  patch: UpdateDashboardPreferencesInput,
): DashboardPreferences {
  const base = parseDashboardPreferences(current);
  const parsed = UpdateDashboardPreferencesSchema.parse(patch ?? {});
  return DashboardPreferencesSchema.parse({
    ...base,
    ...parsed,
    widgetOrder: parsed.widgetOrder ? sanitizeWidgetIds(parsed.widgetOrder) : base.widgetOrder,
    hiddenWidgets: parsed.hiddenWidgets
      ? sanitizeWidgetIds(parsed.hiddenWidgets)
      : base.hiddenWidgets,
    updatedAt: new Date().toISOString(),
  });
}

export function resolveVisibleDashboardWidgets(
  preferences: DashboardPreferences,
  available: DashboardWidgetId[],
): DashboardWidgetId[] {
  const availableSet = new Set(available);
  const hidden = new Set(preferences.hiddenWidgets);
  const ordered = preferences.widgetOrder.filter((id) => availableSet.has(id) && !hidden.has(id));
  for (const id of available) {
    if (!hidden.has(id) && !ordered.includes(id)) {
      ordered.push(id);
    }
  }
  return ordered;
}
