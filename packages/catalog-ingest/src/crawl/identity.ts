/** Normalize card names for cross-source fuzzy matching. */
export function normalizeCardName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(credit\s*card|card|bank|the|a|an)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeSourceUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    parsed.search = '';
    let path = parsed.pathname.replace(/\/+$/, '');
    if (!path) path = '/';
    return `${parsed.origin}${path}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

/** Jaccard-ish token overlap for fuzzy card name match within a bank. */
export function cardNameSimilarity(a: string, b: string): number {
  const left = new Set(normalizeCardName(a).split(' ').filter((t) => t.length > 1));
  const right = new Set(normalizeCardName(b).split(' ').filter((t) => t.length > 1));
  if (left.size === 0 || right.size === 0) return 0;
  let overlap = 0;
  for (const token of left) {
    if (right.has(token)) overlap += 1;
  }
  return overlap / Math.max(left.size, right.size);
}

export function isLikelySameCard(
  left: { bankSlug: string; name: string },
  right: { bankSlug: string; name: string },
  threshold = 0.72,
): boolean {
  if (left.bankSlug !== right.bankSlug) return false;
  if (normalizeCardName(left.name) === normalizeCardName(right.name)) return true;
  return cardNameSimilarity(left.name, right.name) >= threshold;
}
