/** Strip trailing UUIDs / opaque ids that leaked into offer titles from fixtures. */
const TRAILING_UUID = /\s+[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function formatOfferTitle(title: string | null | undefined, slug?: string | null): string {
  const cleaned = (title ?? '').replace(TRAILING_UUID, '').trim();
  if (cleaned) return cleaned;
  if (slug?.trim()) {
    return slug
      .trim()
      .replace(TRAILING_UUID, '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return 'Offer';
}
