import {
  normalizeTransactionCategorySlug,
  type TransactionCategorySlug,
  type TransactionStatus,
} from '@cardwise/validation';

export type ParsedCsvTransactionRow = {
  line: number;
  userCardId: string | null;
  amountInr: number;
  merchantName: string;
  categorySlug: TransactionCategorySlug;
  status: TransactionStatus;
  transactedAt: Date;
  externalRef: string | null;
};

export type CsvParseError = {
  line: number;
  message: string;
};

export type CsvParseResult = {
  rows: ParsedCsvTransactionRow[];
  errors: CsvParseError[];
};

const HEADER_ALIASES: Record<string, keyof RowFields> = {
  date: 'date',
  transacted_at: 'date',
  transaction_date: 'date',
  amount: 'amount',
  amount_inr: 'amount',
  merchant: 'merchant',
  merchant_name: 'merchant',
  category: 'category',
  category_slug: 'category',
  user_card_id: 'userCardId',
  card_id: 'userCardId',
  status: 'status',
  reference: 'reference',
  external_ref: 'reference',
  ref: 'reference',
};

type RowFields = {
  date?: string;
  amount?: string;
  merchant?: string;
  category?: string;
  userCardId?: string;
  status?: string;
  reference?: string;
};

export function parseTransactionsCsv(csv: string, defaultUserCardId?: string): CsvParseResult {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rows: ParsedCsvTransactionRow[] = [];
  const errors: CsvParseError[] = [];

  if (lines.length === 0) {
    errors.push({ line: 1, message: 'CSV is empty' });
    return { rows, errors };
  }

  let startIndex = 0;
  const firstFields = splitCsvLine(lines[0]!);
  const headerMap = buildHeaderMap(firstFields);
  if (headerMap) {
    startIndex = 1;
  }

  for (let index = startIndex; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const fields = splitCsvLine(lines[index]!);
    const parsed = headerMap ? mapHeaderRow(fields, headerMap) : mapPositionalRow(fields);

    const merchantName = parsed.merchant?.trim();
    const amountRaw = parsed.amount?.trim();
    const dateRaw = parsed.date?.trim();
    const userCardId = parsed.userCardId?.trim() || defaultUserCardId || null;

    if (!merchantName) {
      errors.push({ line: lineNumber, message: 'Merchant name is required' });
      continue;
    }

    if (!userCardId) {
      errors.push({
        line: lineNumber,
        message: 'user_card_id is required (column or defaultUserCardId)',
      });
      continue;
    }

    const amountInr = parseAmount(amountRaw);
    if (amountInr == null || amountInr === 0) {
      errors.push({ line: lineNumber, message: 'Amount must be a non-zero number' });
      continue;
    }

    const transactedAt = parseDate(dateRaw);
    if (!transactedAt) {
      errors.push({ line: lineNumber, message: 'Invalid date — use YYYY-MM-DD or DD/MM/YYYY' });
      continue;
    }

    const status = parseStatus(parsed.status, amountInr);
    const categorySlug = normalizeTransactionCategorySlug(parsed.category);
    const externalRef = parsed.reference?.trim() || null;

    rows.push({
      line: lineNumber,
      userCardId,
      amountInr: Math.abs(amountInr),
      merchantName,
      categorySlug,
      status,
      transactedAt,
      externalRef,
    });
  }

  return { rows, errors };
}

function buildHeaderMap(fields: string[]): Map<number, keyof RowFields> | null {
  const normalized = fields.map((field) => field.trim().toLowerCase());
  const hasKnownHeader = normalized.some((field) => field in HEADER_ALIASES);
  if (!hasKnownHeader) return null;

  const map = new Map<number, keyof RowFields>();
  normalized.forEach((field, index) => {
    const alias = HEADER_ALIASES[field];
    if (alias) map.set(index, alias);
  });
  return map;
}

function mapHeaderRow(fields: string[], headerMap: Map<number, keyof RowFields>): RowFields {
  const row: RowFields = {};
  for (const [index, key] of headerMap.entries()) {
    row[key] = fields[index]?.trim();
  }
  return row;
}

function mapPositionalRow(fields: string[]): RowFields {
  return {
    date: fields[0],
    amount: fields[1],
    merchant: fields[2],
    category: fields[3],
    userCardId: fields[4],
    status: fields[5],
    reference: fields[6],
  };
}

function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]!;
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
      continue;
    }
    current += char;
  }

  fields.push(current);
  return fields.map((field) => field.trim());
}

function parseAmount(raw: string | undefined): number | null {
  if (!raw?.trim()) return null;
  const normalized = raw.replace(/[₹,\s]/g, '');
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

function parseDate(raw: string | undefined): Date | null {
  if (!raw?.trim()) return null;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const date = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T12:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) {
    const day = dmy[1]!.padStart(2, '0');
    const month = dmy[2]!.padStart(2, '0');
    const date = new Date(`${dmy[3]}-${month}-${day}T12:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseStatus(raw: string | undefined, amountInr: number): TransactionStatus {
  if (amountInr < 0) return 'REFUND';
  const normalized = raw?.trim().toUpperCase();
  if (normalized === 'PENDING') return 'PENDING';
  if (normalized === 'FAILED') return 'FAILED';
  if (normalized === 'REFUND') return 'REFUND';
  return 'POSTED';
}
