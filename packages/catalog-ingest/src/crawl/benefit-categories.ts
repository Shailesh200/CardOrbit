/** Benefit type codes aligned with catalog-import publish + consumer card detail. */
export const BENEFIT_CATEGORY_CODES = [
  'FEES',
  'REWARDS',
  'LOUNGE',
  'INSURANCE',
  'FUEL',
  'DINING',
  'TRAVEL',
  'SHOPPING',
  'WELCOME',
  'CASHBACK',
  'ENTERTAINMENT',
  'EMI',
  'APPROVAL',
  'ELIGIBILITY',
] as const;

export type BenefitCategoryCode = (typeof BENEFIT_CATEGORY_CODES)[number];

export const BENEFIT_CATEGORY_LABELS: Record<BenefitCategoryCode, string> = {
  FEES: 'Fees & charges',
  REWARDS: 'Rewards',
  LOUNGE: 'Lounge access',
  INSURANCE: 'Insurance & protection',
  FUEL: 'Fuel',
  DINING: 'Dining',
  TRAVEL: 'Travel',
  SHOPPING: 'Shopping & offers',
  WELCOME: 'Welcome offers',
  CASHBACK: 'Cashback',
  ENTERTAINMENT: 'Entertainment',
  EMI: 'EMI & interest',
  APPROVAL: 'How to apply',
  ELIGIBILITY: 'Eligibility',
};

export function inferBenefitCategory(title: string, description = ''): BenefitCategoryCode {
  const text = `${title} ${description}`.toLowerCase();

  if (text.includes('eligib') || text.includes('who can apply') || text.includes('age ')) {
    return 'ELIGIBILITY';
  }
  if (
    text.includes('how to apply') ||
    text.includes('how do i apply') ||
    text.includes('apply now') ||
    text.includes('approval') ||
    text.includes('dispatch')
  ) {
    return 'APPROVAL';
  }
  if (
    text.includes('annual fee') ||
    text.includes('joining fee') ||
    text.includes('apr') ||
    text.includes('interest rate') ||
    text.includes('forex') ||
    text.includes('markup') ||
    text.includes('cash withdrawal') ||
    text.includes('late payment') ||
    text.includes('redemption fee')
  ) {
    return 'FEES';
  }
  if (text.includes('lounge') || text.includes('railway lounge')) return 'LOUNGE';
  if (text.includes('fuel') || text.includes('surcharge waiver')) return 'FUEL';
  if (text.includes('insurance') || text.includes('liability cover') || text.includes('roadside')) {
    return 'INSURANCE';
  }
  if (text.includes('cashback')) return 'CASHBACK';
  if (text.includes('welcome') || text.includes('gift voucher') || text.includes('voucher')) {
    return 'WELCOME';
  }
  if (text.includes('movie') || text.includes('entertainment') || text.includes('district')) {
    return 'ENTERTAINMENT';
  }
  if (text.includes('emi') || text.includes('interest-free') || text.includes('interest free')) {
    return 'EMI';
  }
  if (
    text.includes('dining') ||
    text.includes('restaurant') ||
    text.includes('zomato') ||
    text.includes('swiggy')
  ) {
    return 'DINING';
  }
  if (
    text.includes('travel') ||
    text.includes('flight') ||
    text.includes('hotel') ||
    text.includes('forex') ||
    text.includes('airport') ||
    text.includes('golf')
  ) {
    return 'TRAVEL';
  }
  if (text.includes('merchant offer') || text.includes('shopping')) return 'SHOPPING';
  if (
    text.includes('reward') ||
    text.includes('point') ||
    /\d+x/.test(text) ||
    text.includes('bluchip') ||
    text.includes('miles')
  ) {
    return 'REWARDS';
  }

  return 'REWARDS';
}

export function normalizeHighlightKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
