import {
  CARD_BENEFIT_SECTION_CODES,
  CARD_BENEFIT_SECTION_LABELS,
  type CardAnnualFeeSummary,
  type CardBenefitItem,
  type CardBenefitSection,
  type CardBenefitSectionCode,
  type CardMilestonePreview,
  type CardRewardRuleSummary,
  type RewardRulePayload,
} from '@cardwise/validation';

type RawBenefit = {
  id: string;
  title: string;
  description: string | null;
  sourceUrl: string | null;
  benefitType?: { code: string; name: string } | null;
};

type RawFee = {
  id: string;
  feeType: string;
  amountInr: number | null;
  waiverConditions: unknown;
};

export function resolveBenefitSectionCode(typeCode: string | undefined): CardBenefitSectionCode {
  if (!typeCode) return 'OTHER';
  const normalized = typeCode.toUpperCase();
  if ((CARD_BENEFIT_SECTION_CODES as readonly string[]).includes(normalized)) {
    return normalized as CardBenefitSectionCode;
  }
  return 'OTHER';
}

export function mapBenefitItem(benefit: RawBenefit, cardSourceUrl: string | null): CardBenefitItem {
  const sectionCode = resolveBenefitSectionCode(benefit.benefitType?.code);
  return {
    id: benefit.id,
    title: benefit.title,
    description: benefit.description,
    sectionCode,
    sectionLabel: benefit.benefitType?.name ?? CARD_BENEFIT_SECTION_LABELS[sectionCode],
    sourceUrl: benefit.sourceUrl ?? cardSourceUrl,
  };
}

export function groupBenefitSections(
  benefits: RawBenefit[],
  cardSourceUrl: string | null,
): CardBenefitSection[] {
  const items = benefits.map((row) => mapBenefitItem(row, cardSourceUrl));
  const grouped = new Map<string, CardBenefitItem[]>();

  for (const item of items) {
    const list = grouped.get(item.sectionCode) ?? [];
    list.push(item);
    grouped.set(item.sectionCode, list);
  }

  const sections: CardBenefitSection[] = [];
  for (const code of CARD_BENEFIT_SECTION_CODES) {
    const sectionItems = grouped.get(code);
    if (!sectionItems?.length) continue;
    sections.push({
      code,
      label: CARD_BENEFIT_SECTION_LABELS[code],
      items: sectionItems,
    });
  }

  const otherItems = grouped.get('OTHER');
  if (otherItems?.length && !sections.some((section) => section.code === 'OTHER')) {
    sections.push({
      code: 'OTHER',
      label: CARD_BENEFIT_SECTION_LABELS.OTHER,
      items: otherItems,
    });
  }

  return sections;
}

export function filterBenefitsBySection(
  benefits: RawBenefit[],
  cardSourceUrl: string | null,
  sectionCode: CardBenefitSectionCode,
): CardBenefitItem[] {
  return benefits
    .map((row) => mapBenefitItem(row, cardSourceUrl))
    .filter((item) => item.sectionCode === sectionCode);
}

export function mapRewardRuleSummary(input: {
  id: string;
  ruleKey: string;
  name: string;
  spendCategoryCode: string | null;
  payload: RewardRulePayload;
}): CardRewardRuleSummary {
  const payload = input.payload;
  return {
    id: input.id,
    ruleKey: input.ruleKey,
    name: input.name,
    spendCategoryCode: input.spendCategoryCode,
    rewardMultiplier: payload.rewardMultiplier ?? null,
    cashbackPercent: payload.cashbackPercent ?? null,
    milestoneBonus: payload.milestoneBonus ?? null,
    spendThreshold: payload.spendThreshold ?? null,
    capSummary: buildCapSummary(payload),
  };
}

export function buildMilestonePreviews(rules: CardRewardRuleSummary[]): CardMilestonePreview[] {
  return rules
    .filter((rule) => rule.milestoneBonus != null || rule.spendThreshold != null)
    .map((rule) => ({
      id: rule.id,
      label: rule.spendThreshold
        ? `Spend ₹${Math.round(rule.spendThreshold).toLocaleString('en-IN')} — bonus ${rule.milestoneBonus ?? 0}`
        : `Milestone bonus — ${rule.milestoneBonus ?? 0}`,
      spendThreshold: rule.spendThreshold,
      milestoneBonus: rule.milestoneBonus,
      sourceRuleName: rule.name,
    }));
}

export function buildAnnualFeeSummary(input: {
  annualFeeInr: number | null;
  joiningFeeInr: number | null;
  fees: RawFee[];
  feeBenefits: CardBenefitItem[];
}): CardAnnualFeeSummary {
  return {
    annualFeeInr: input.annualFeeInr,
    joiningFeeInr: input.joiningFeeInr,
    fees: input.fees.map((fee) => ({
      id: fee.id,
      feeType: fee.feeType,
      amountInr: fee.amountInr,
      waiverConditions: formatWaiverConditions(fee.waiverConditions),
    })),
    feeBenefits: input.feeBenefits,
  };
}

function buildCapSummary(payload: RewardRulePayload): string | null {
  const parts: string[] = [];
  if (payload.capPeriod && payload.periodCapInr != null) {
    parts.push(
      `${payload.capPeriod} cap ₹${Math.round(payload.periodCapInr).toLocaleString('en-IN')}`,
    );
  } else if (payload.cap != null) {
    parts.push(`Cap ₹${Math.round(payload.cap).toLocaleString('en-IN')} per transaction`);
  } else if (payload.monthlyLimit != null) {
    parts.push(`Monthly cap ₹${Math.round(payload.monthlyLimit).toLocaleString('en-IN')}`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

function formatWaiverConditions(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  }
  return String(value);
}
