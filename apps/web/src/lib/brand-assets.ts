/** Generic flat PNG fallbacks when catalog assets have no URL configured. */
export { placeholderAssets, placeholderFor } from './placeholders';

import { placeholderAssets } from './placeholders';

const API_BASE = import.meta.env.VITE_API_URL || '';

export type BrandRegistry = {
  banks: Record<string, string | null>;
  merchants: Record<string, string | null>;
  creditCards: Record<string, string | null>;
};

let registryPromise: Promise<BrandRegistry> | null = null;

export async function fetchBrandRegistry(): Promise<BrandRegistry> {
  if (!registryPromise) {
    registryPromise = fetch(`${API_BASE}/api/v1/assets/brands`, {
      headers: { Accept: 'application/json' },
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error('Brand registry unavailable');
      }
      return response.json() as Promise<BrandRegistry>;
    });
  }

  try {
    return await registryPromise;
  } catch (error) {
    registryPromise = null;
    throw error;
  }
}

/** Strip seeded duplicate suffixes (e.g. swiggy-2 → swiggy). */
export function normalizeBrandSlug(slug: string): string {
  return slug.replace(/-\d+$/, '');
}

export function resolveMerchantLogo(
  registry: BrandRegistry | null,
  slug: string,
  directUrl?: string | null,
): string {
  if (directUrl) return directUrl;
  if (registry) {
    const brand = normalizeBrandSlug(slug);
    const resolved = registry.merchants[brand] ?? registry.merchants[slug];
    if (resolved) return resolved;
  }
  return placeholderAssets.merchant;
}

export function resolveBankLogo(
  registry: BrandRegistry | null,
  slug: string,
  directUrl?: string | null,
): string {
  if (directUrl) return directUrl;
  if (registry) {
    const brand = normalizeBrandSlug(slug);
    const resolved = registry.banks[brand] ?? registry.banks[slug];
    if (resolved) return resolved;
  }
  return placeholderAssets.bank;
}

export function resolveCreditCardImage(
  registry: BrandRegistry | null,
  slug: string,
  directUrl?: string | null,
): string {
  if (directUrl) return directUrl;
  if (registry) {
    const resolved = registry.creditCards[slug];
    if (resolved) return resolved;
  }
  return placeholderAssets.creditCard;
}

const MINI_CARD_BANK_SLUGS = new Set(['hdfc', 'icici', 'axis', 'sbi', 'kotak', 'idfc-first']);

export function miniCardBankClass(bankSlug: string): string {
  const brand = normalizeBrandSlug(bankSlug);
  return MINI_CARD_BANK_SLUGS.has(brand) ? `mini-card--${brand}` : 'mini-card--default';
}
