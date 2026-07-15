const STORAGE_KEY = 'cardwise.recentMerchants';
const MAX_RECENT = 8;

export type RecentMerchant = {
  id: string;
  name: string;
  slug: string;
};

export function getRecentMerchants(): RecentMerchant[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentMerchant[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function pushRecentMerchant(merchant: RecentMerchant): RecentMerchant[] {
  const next = [
    merchant,
    ...getRecentMerchants().filter((item) => item.slug !== merchant.slug),
  ].slice(0, MAX_RECENT);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function clearRecentMerchants(): void {
  localStorage.removeItem(STORAGE_KEY);
}
