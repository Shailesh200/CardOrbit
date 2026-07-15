const MIN_AMOUNT = 100;
const MAX_AMOUNT = 10_000_000;

const TOTAL_KEYWORDS = [
  'order total',
  'cart total',
  'grand total',
  'total amount',
  'amount payable',
  'to pay',
  'payable',
  'subtotal',
  'total:',
  'total due',
];

/** Merchant-specific selectors for checkout totals (M-032). */
const MERCHANT_AMOUNT_SELECTORS: Readonly<Record<string, readonly string[]>> = {
  amazon: ['#subtotals-marketplace-table', '#checkout-subtotals-section', '[data-testid="order-total"]'],
  flipkart: ['._2UzuFa', '._1AtVbE', '[class*="total"]'],
  swiggy: ['[class*="bill"]', '[class*="total"]'],
  myntra: ['[class*="priceDetail"]', '[class*="totalAmount"]'],
};

export function parseInrAmount(raw: string): number | null {
  const match = raw.match(/([\d,]+(?:\.\d{1,2})?)/);
  if (!match?.[1]) return null;
  const normalized = match[1].replace(/,/g, '');
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value)) return null;
  if (value < MIN_AMOUNT || value > MAX_AMOUNT) return null;
  return Math.round(value);
}

function extractAmountFromText(text: string): number | null {
  const matches = text.match(/(?:₹|rs\.?\s*|inr\s*)([\d,]+(?:\.\d{1,2})?)/gi);
  if (!matches?.length) return null;

  const amounts = matches
    .map((match) => parseInrAmount(match))
    .filter((value): value is number => value != null);

  return amounts.length > 0 ? Math.max(...amounts) : null;
}

function scanElements(root: ParentNode, predicate: (text: string) => boolean): number | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let node = walker.currentNode as Element | null;

  while (node) {
    const text = node.textContent?.trim().toLowerCase() ?? '';
    if (text && predicate(text)) {
      const amount = extractAmountFromText(node.textContent ?? '');
      if (amount != null) return amount;
    }
    node = walker.nextNode() as Element | null;
  }

  return null;
}

function detectFromMerchantSelectors(merchantSlug: string | null): number | null {
  if (!merchantSlug) return null;
  const selectors = MERCHANT_AMOUNT_SELECTORS[merchantSlug];
  if (!selectors) return null;

  for (const selector of selectors) {
    const nodes = document.querySelectorAll(selector);
    for (const node of nodes) {
      const amount = extractAmountFromText(node.textContent ?? '');
      if (amount != null) return amount;
    }
  }

  return null;
}

function detectFromTotalLabels(): number | null {
  return scanElements(document.body, (text) =>
    TOTAL_KEYWORDS.some((keyword) => text.includes(keyword)),
  );
}

function detectFromPriceMeta(): number | null {
  const metaAmount =
    document.querySelector('meta[property="product:price:amount"]')?.getAttribute('content') ??
    document.querySelector('meta[itemprop="price"]')?.getAttribute('content');

  if (metaAmount) {
    const parsed = parseInrAmount(metaAmount);
    if (parsed != null) return parsed;
  }

  return null;
}

/** Best-effort cart/checkout amount detection from the active page DOM. */
export function detectCheckoutAmount(merchantSlug: string | null): number | null {
  return (
    detectFromMerchantSelectors(merchantSlug) ??
    detectFromTotalLabels() ??
    detectFromPriceMeta()
  );
}

export function resolveCheckoutAmount(
  merchantSlug: string | null,
  fallbackAmount: number,
): number {
  return detectCheckoutAmount(merchantSlug) ?? fallbackAmount;
}
