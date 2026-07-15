import type {
  CardBenefitItem,
  LifestyleCoverageType,
  LifestyleDiningBenefit,
  LifestyleEmiBenefit,
  LifestyleFuelBenefit,
  LifestyleInsuranceBenefit,
} from '@cardwise/validation';

export function parseInsuranceCoverage(
  title: string,
  description: string | null,
): { coverageLabel: string | null; coverageType: LifestyleCoverageType | null } {
  const text = `${title} ${description ?? ''}`.toLowerCase();

  let coverageLabel: string | null = null;
  const amountMatch = text.match(/(?:₹\s*)?(\d+(?:\.\d+)?)\s*(lakh|lac|crore|cr|million)/i);
  if (amountMatch) {
    const unit = amountMatch[2]!.toLowerCase().startsWith('cr') ? 'crore' : 'lakh';
    coverageLabel = `₹${amountMatch[1]} ${unit}`;
  }

  let coverageType: LifestyleCoverageType | null = null;
  if (text.includes('travel')) coverageType = 'TRAVEL';
  else if (text.includes('medical') || text.includes('health') || text.includes('hospital'))
    coverageType = 'MEDICAL';
  else if (text.includes('purchase') || text.includes('lost card') || text.includes('fraud'))
    coverageType = 'PURCHASE';
  else if (text.includes('insurance') || text.includes('cover')) coverageType = 'GENERAL';

  return { coverageLabel, coverageType };
}

export function parseFuelBenefitDetails(
  title: string,
  description: string | null,
): { surchargeWaiver: boolean; waiverCapLabel: string | null } {
  const text = `${title} ${description ?? ''}`.toLowerCase();
  const surchargeWaiver =
    text.includes('surcharge') &&
    (text.includes('waiver') || text.includes('waived') || text.includes('refund'));

  let waiverCapLabel: string | null = null;
  const capMatch = text.match(/(?:₹\s*)?(\d[\d,]*)\s*(?:per\s+)?(month|transaction|day)/i);
  if (capMatch) {
    waiverCapLabel = `₹${capMatch[1]!.replace(/,/g, '')}/${capMatch[2]!.toLowerCase()}`;
  }

  return { surchargeWaiver, waiverCapLabel };
}

export function parseDiningBenefitDetails(
  title: string,
  description: string | null,
): { discountPercent: number | null; programName: string | null } {
  const text = `${title} ${description ?? ''}`;
  const lower = text.toLowerCase();

  let discountPercent: number | null = null;
  const discountMatch = lower.match(/(\d+(?:\.\d+)?)\s*%\s*(?:off|discount|cashback)?/);
  if (discountMatch) discountPercent = Number(discountMatch[1]);

  const programs = ['swiggy', 'zomato', 'dineout', 'eazydiner', 'bookmyshow', 'district'];
  const programName = programs.find((name) => lower.includes(name)) ?? null;

  return { discountPercent, programName };
}

export function parseEmiBenefitDetails(
  title: string,
  description: string | null,
): {
  noCostEmi: boolean;
  interestRateLabel: string | null;
  maxTenureMonths: number | null;
} {
  const text = `${title} ${description ?? ''}`.toLowerCase();

  const noCostEmi =
    text.includes('no cost') ||
    text.includes('zero cost') ||
    text.includes('0% emi') ||
    text.includes('0 percent emi');

  let interestRateLabel: string | null = null;
  const rateMatch = text.match(/(\d+(?:\.\d+)?)\s*%\s*(?:p\.a\.|interest|emi)?/);
  if (rateMatch) interestRateLabel = `${rateMatch[1]}%`;

  let maxTenureMonths: number | null = null;
  const tenureMatch = text.match(/(\d+)\s*(?:months|month|mo)\b/);
  if (tenureMatch) maxTenureMonths = Number(tenureMatch[1]);

  return { noCostEmi, interestRateLabel, maxTenureMonths };
}

export function enrichInsuranceBenefits(items: CardBenefitItem[]): LifestyleInsuranceBenefit[] {
  return items.map((item) => ({
    ...item,
    ...parseInsuranceCoverage(item.title, item.description),
  }));
}

export function enrichFuelBenefits(items: CardBenefitItem[]): LifestyleFuelBenefit[] {
  return items.map((item) => ({
    ...item,
    ...parseFuelBenefitDetails(item.title, item.description),
  }));
}

export function enrichDiningBenefits(items: CardBenefitItem[]): LifestyleDiningBenefit[] {
  return items.map((item) => ({
    ...item,
    ...parseDiningBenefitDetails(item.title, item.description),
  }));
}

export function enrichEmiBenefits(items: CardBenefitItem[]): LifestyleEmiBenefit[] {
  return items.map((item) => ({
    ...item,
    ...parseEmiBenefitDetails(item.title, item.description),
  }));
}

export function summarizeInsuranceBenefits(items: LifestyleInsuranceBenefit[]): string | null {
  if (items.length === 0) return null;
  const primary = items[0]!;
  if (primary.coverageLabel) return primary.coverageLabel;
  return items.length === 1 ? primary.title : `${primary.title} +${items.length - 1} more`;
}

export function summarizeFuelBenefits(items: LifestyleFuelBenefit[]): string | null {
  if (items.length === 0) return null;
  const waiver = items.find((row) => row.surchargeWaiver);
  if (waiver?.waiverCapLabel) return `Surcharge waiver ${waiver.waiverCapLabel}`;
  if (waiver) return 'Fuel surcharge waiver';
  return items.length === 1 ? items[0]!.title : `${items[0]!.title} +${items.length - 1} more`;
}

export function summarizeDiningBenefits(items: LifestyleDiningBenefit[]): string | null {
  if (items.length === 0) return null;
  const best = [...items].sort((a, b) => (b.discountPercent ?? 0) - (a.discountPercent ?? 0))[0]!;
  if (best.discountPercent != null) {
    return best.programName
      ? `${best.discountPercent}% off · ${best.programName}`
      : `${best.discountPercent}% dining benefit`;
  }
  return items.length === 1 ? best.title : `${best.title} +${items.length - 1} more`;
}

export function summarizeEmiBenefits(items: LifestyleEmiBenefit[]): string | null {
  if (items.length === 0) return null;
  const noCost = items.find((row) => row.noCostEmi);
  if (noCost) return 'No-cost EMI available';
  const primary = items[0]!;
  if (primary.interestRateLabel) return `EMI from ${primary.interestRateLabel}`;
  return items.length === 1 ? primary.title : `${primary.title} +${items.length - 1} more`;
}
