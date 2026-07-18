/** Lightweight field validation helpers (no form library). */

export function requiredMessage(value: string, label: string): string | null {
  if (!value.trim()) return `${label} is required`;
  return null;
}

export function fieldDescribedBy(id: string, error: string | null | undefined): string | undefined {
  return error ? `${id}-error` : undefined;
}
