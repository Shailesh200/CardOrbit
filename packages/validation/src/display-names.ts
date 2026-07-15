import { SPENDING_CATEGORY_LABELS } from './spending-insights';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True when a string looks like a UUID / opaque id rather than a human label. */
export function looksLikeOpaqueId(value: string | null | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  return UUID_RE.test(trimmed) || /^[0-9a-f]{24,}$/i.test(trimmed);
}

/**
 * Prefer a real merchant name. Never return a slug, UUID, or opaque id as the label.
 */
export function displayMerchantName(input: {
  name?: string | null;
  slug?: string | null;
  fallback?: string;
}): string {
  const name = input.name?.trim();
  if (name && !looksLikeOpaqueId(name)) return name;
  return input.fallback ?? 'Merchant';
}

/** Human label for a spend category slug. */
export function displayCategoryLabel(slug: string | null | undefined): string {
  if (!slug?.trim()) return 'General';
  const key = slug.trim().toLowerCase();
  if (SPENDING_CATEGORY_LABELS[key]) return SPENDING_CATEGORY_LABELS[key]!;
  return key
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
