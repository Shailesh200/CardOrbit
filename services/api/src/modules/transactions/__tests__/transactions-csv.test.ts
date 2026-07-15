import { describe, expect, it } from 'vitest';

import { parseTransactionsCsv } from '../transactions-csv';

describe('parseTransactionsCsv', () => {
  it('parses header-based CSV rows', () => {
    const result = parseTransactionsCsv(
      `date,amount,merchant,category,user_card_id,reference
2026-06-01,1500,Swiggy,dining,uc-1,ref-001
2026-06-02,2500,Amazon,online,uc-1,ref-002`,
    );

    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]?.merchantName).toBe('Swiggy');
    expect(result.rows[0]?.categorySlug).toBe('dining');
    expect(result.rows[0]?.externalRef).toBe('ref-001');
  });

  it('uses default card id when column is missing', () => {
    const result = parseTransactionsCsv(
      `date,amount,merchant,category
01/06/2026,999,Zomato,dining`,
      'uc-default',
    );

    expect(result.errors).toHaveLength(0);
    expect(result.rows[0]?.userCardId).toBe('uc-default');
    expect(result.rows[0]?.amountInr).toBe(999);
  });

  it('marks negative amounts as refunds', () => {
    const result = parseTransactionsCsv(
      `date,amount,merchant,category,user_card_id
2026-06-03,-500,Amazon,online,uc-1`,
    );

    expect(result.rows[0]?.status).toBe('REFUND');
    expect(result.rows[0]?.amountInr).toBe(500);
  });

  it('reports validation errors per line', () => {
    const result = parseTransactionsCsv(
      `date,amount,merchant,category,user_card_id
bad-date,100,,dining,uc-1`,
    );

    expect(result.rows).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
