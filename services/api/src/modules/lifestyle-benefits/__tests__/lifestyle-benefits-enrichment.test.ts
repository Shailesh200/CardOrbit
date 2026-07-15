import { describe, expect, it } from 'vitest';

import {
  enrichDiningBenefits,
  enrichEmiBenefits,
  enrichFuelBenefits,
  enrichInsuranceBenefits,
  parseDiningBenefitDetails,
  parseEmiBenefitDetails,
  parseFuelBenefitDetails,
  parseInsuranceCoverage,
  summarizeDiningBenefits,
  summarizeFuelBenefits,
} from '../lifestyle-benefits-enrichment';

describe('parseInsuranceCoverage', () => {
  it('extracts travel insurance coverage amount', () => {
    const parsed = parseInsuranceCoverage('Overseas travel insurance', 'Coverage up to ₹50 lakh');
    expect(parsed.coverageLabel).toBe('₹50 lakh');
    expect(parsed.coverageType).toBe('TRAVEL');
  });
});

describe('parseFuelBenefitDetails', () => {
  it('detects surcharge waiver with monthly cap', () => {
    const parsed = parseFuelBenefitDetails(
      'Fuel surcharge waiver',
      '1% surcharge waived up to ₹400 per month',
    );
    expect(parsed.surchargeWaiver).toBe(true);
    expect(parsed.waiverCapLabel).toBe('₹400/month');
  });
});

describe('parseDiningBenefitDetails', () => {
  it('extracts dining discount and partner', () => {
    const parsed = parseDiningBenefitDetails('Swiggy Dineout', '15% off on partner restaurants');
    expect(parsed.discountPercent).toBe(15);
    expect(parsed.programName).toBe('swiggy');
  });
});

describe('parseEmiBenefitDetails', () => {
  it('detects no-cost EMI offers', () => {
    const parsed = parseEmiBenefitDetails(
      'No cost EMI',
      '0% EMI for 12 months on select merchants',
    );
    expect(parsed.noCostEmi).toBe(true);
    expect(parsed.maxTenureMonths).toBe(12);
  });
});

describe('enrichFuelBenefits', () => {
  it('adds structured metadata to fuel items', () => {
    const items = enrichFuelBenefits([
      {
        id: '1',
        title: 'Fuel surcharge waiver',
        description: 'Waived up to ₹250 per transaction',
        sectionCode: 'FUEL',
        sectionLabel: 'Fuel',
        sourceUrl: null,
      },
    ]);
    expect(items[0]?.surchargeWaiver).toBe(true);
    expect(items[0]?.waiverCapLabel).toBe('₹250/transaction');
  });
});

describe('summarizeFuelBenefits', () => {
  it('prefers surcharge waiver summary', () => {
    const summary = summarizeFuelBenefits(
      enrichFuelBenefits([
        {
          id: '1',
          title: 'Fuel surcharge waiver',
          description: 'Up to ₹400 per month',
          sectionCode: 'FUEL',
          sectionLabel: 'Fuel',
          sourceUrl: null,
        },
      ]),
    );
    expect(summary).toContain('Surcharge waiver');
  });
});

describe('summarizeDiningBenefits', () => {
  it('highlights best discount', () => {
    const summary = summarizeDiningBenefits(
      enrichDiningBenefits([
        {
          id: '1',
          title: 'Zomato Gold',
          description: '20% off dining',
          sectionCode: 'DINING',
          sectionLabel: 'Dining',
          sourceUrl: null,
        },
      ]),
    );
    expect(summary).toContain('20%');
  });
});

describe('enrichInsuranceBenefits', () => {
  it('maps medical coverage type', () => {
    const items = enrichInsuranceBenefits([
      {
        id: '1',
        title: 'Air accident cover',
        description: 'Medical emergency cover ₹1 crore',
        sectionCode: 'INSURANCE',
        sectionLabel: 'Insurance',
        sourceUrl: null,
      },
    ]);
    expect(items[0]?.coverageType).toBe('MEDICAL');
  });
});

describe('enrichEmiBenefits', () => {
  it('parses interest rate when not no-cost', () => {
    const items = enrichEmiBenefits([
      {
        id: '1',
        title: 'Easy EMI',
        description: '12% p.a. interest for 24 months',
        sectionCode: 'EMI',
        sectionLabel: 'EMI',
        sourceUrl: null,
      },
    ]);
    expect(items[0]?.noCostEmi).toBe(false);
    expect(items[0]?.interestRateLabel).toBe('12%');
    expect(items[0]?.maxTenureMonths).toBe(24);
  });
});
