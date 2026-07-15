/** Generic flat PNG fallbacks when catalog assets have no URL configured. */
export const placeholderAssets = {
  bank: '/placeholders/bank-default.png',
  merchant: '/placeholders/merchant-default.png',
  creditCard: '/placeholders/credit-card-default.png',
} as const;

export type PlaceholderAssetType = keyof typeof placeholderAssets;

export function placeholderFor(type: PlaceholderAssetType): string {
  return placeholderAssets[type];
}
