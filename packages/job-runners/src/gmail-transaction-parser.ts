export type ParsedGmailTransaction = {
  amountInr: number;
  merchantName: string;
  transactedAt: Date;
  bankHint: string | null;
  rawSnippet: string;
};

const AMOUNT_PATTERNS = [
  /(?:Rs\.?|INR|₹)\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.\d{1,2})?|[0-9]+(?:\.\d{1,2})?)\s*(?:was\s+)?(?:spent|debited|paid|charged|used|withdrawn)/i,
  /(?:spent|debited|paid|charged|used)\s+(?:of\s+)?(?:Rs\.?|INR|₹)\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.\d{1,2})?|[0-9]+(?:\.\d{1,2})?)/i,
  /(?:transaction|txn|purchase)\s+(?:of\s+)?(?:Rs\.?|INR|₹)\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.\d{1,2})?|[0-9]+(?:\.\d{1,2})?)/i,
  /(?:Rs\.?|INR|₹)\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.\d{1,2})?|[0-9]+(?:\.\d{1,2})?)\s+(?:on|at)\s+/i,
];

const MERCHANT_PATTERNS = [
  /\bat\s+([A-Za-z0-9][A-Za-z0-9 &.'-]{1,48}?)(?:\s+on\s+\d|\s+using|\s+with\s+your|\s+via|\s+ending|\s*\.|$)/i,
  /\btowards\s+([A-Za-z0-9][A-Za-z0-9 &.'-]{1,48}?)(?:\s+on\s+\d|\s*\.|$)/i,
  /\bmerchant\s*[:-]\s*([A-Za-z0-9][A-Za-z0-9 &.'-]{1,48})/i,
];

const DATE_PATTERNS = [
  /\bon\s+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i,
  /\bon\s+(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4})/i,
  /\b(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})\b/i,
];

const BANK_HINTS: Array<{ hint: string; match: RegExp }> = [
  { hint: 'hdfc', match: /\bhdfc\b/i },
  { hint: 'icici', match: /\bicici\b/i },
  { hint: 'axis', match: /\baxis\b/i },
  { hint: 'sbi', match: /\bsbi\b|\bstate bank\b/i },
  { hint: 'amex', match: /\bamex\b|\bamerican express\b/i },
  { hint: 'kotak', match: /\bkotak\b/i },
  { hint: 'yes', match: /\byes\s*bank\b/i },
  { hint: 'indusind', match: /\bindusind\b/i },
  { hint: 'rbl', match: /\brbl\b/i },
  { hint: 'idfc', match: /\bidfc\b/i },
];

function parseAmount(text: string): number | null {
  for (const pattern of AMOUNT_PATTERNS) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const value = Number(match[1].replace(/,/g, ''));
    if (Number.isFinite(value) && value > 0 && value < 10_000_000) return value;
  }
  return null;
}

function parseMerchant(text: string): string | null {
  for (const pattern of MERCHANT_PATTERNS) {
    const match = text.match(pattern);
    const raw = match?.[1]?.trim();
    if (!raw) continue;
    const cleaned = raw
      .replace(/\s+/g, ' ')
      .replace(/[.,;:]+$/, '')
      .trim();
    if (cleaned.length < 2) continue;
    if (/^(your|the|a|an|rs|inr|card|credit)$/i.test(cleaned)) continue;
    return cleaned.slice(0, 80);
  }
  return null;
}

function parseDate(text: string, fallback: Date): Date {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const candidate = match[1].includes('-') || match[1].includes('/')
      ? match[1].replace(/-/g, '/')
      : match[1];
    const parsed = new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) {
      const now = Date.now();
      if (parsed.getTime() <= now + 86_400_000 && parsed.getTime() > now - 366 * 86_400_000) {
        return parsed;
      }
    }
  }
  return fallback;
}

function parseBankHint(text: string): string | null {
  for (const row of BANK_HINTS) {
    if (row.match.test(text)) return row.hint;
  }
  return null;
}

/** Extract a spend transaction from Indian credit-card alert / statement email text. */
export function parseGmailTransactionAlert(
  text: string,
  options: { fallbackDate?: Date } = {},
): ParsedGmailTransaction | null {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return null;

  const amountInr = parseAmount(normalized);
  if (amountInr == null) return null;

  const merchantName = parseMerchant(normalized) ?? 'Card spend';
  const transactedAt = parseDate(normalized, options.fallbackDate ?? new Date());
  const bankHint = parseBankHint(normalized);

  return {
    amountInr,
    merchantName,
    transactedAt,
    bankHint,
    rawSnippet: normalized.slice(0, 240),
  };
}
