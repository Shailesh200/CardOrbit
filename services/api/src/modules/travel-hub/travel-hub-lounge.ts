import type { TravelLoungeBenefit } from '@cardwise/validation';
import type { CardBenefitItem } from '@cardwise/validation';

export type LoungeAllowance = {
  allowanceLabel: string | null;
  unlimited: boolean;
};

export function parseLoungeAllowance(title: string, description: string | null): LoungeAllowance {
  const text = `${title} ${description ?? ''}`.toLowerCase();

  if (text.includes('unlimited') || text.includes('unrestricted')) {
    return { allowanceLabel: 'Unlimited visits', unlimited: true };
  }

  if (text.includes('visit')) {
    const countMatch = text.match(/(\d+)/);
    if (countMatch) {
      const count = Number(countMatch[1]);
      const period = text.includes('quarter')
        ? 'quarter'
        : text.includes('month')
          ? 'month'
          : 'year';
      return {
        allowanceLabel: `${count} visit${count === 1 ? '' : 's'}/${period}`,
        unlimited: false,
      };
    }
  }

  const genericCount = text.match(/\b(\d+)\s+(?:complimentary|free)\b/i);
  if (genericCount) {
    const count = Number(genericCount[1]);
    return {
      allowanceLabel: `${count} complimentary access`,
      unlimited: false,
    };
  }

  return { allowanceLabel: null, unlimited: false };
}

export function enrichLoungeBenefits(items: CardBenefitItem[]): TravelLoungeBenefit[] {
  return items.map((item) => {
    const parsed = parseLoungeAllowance(item.title, item.description);
    return {
      ...item,
      allowanceLabel: parsed.allowanceLabel,
      unlimited: parsed.unlimited,
    };
  });
}

export function summarizeLoungeBenefits(items: TravelLoungeBenefit[]): string | null {
  if (items.length === 0) return null;
  const primary = items[0]!;
  if (primary.allowanceLabel) return primary.allowanceLabel;
  if (items.length === 1) return primary.title;
  return `${primary.title} +${items.length - 1} more`;
}
