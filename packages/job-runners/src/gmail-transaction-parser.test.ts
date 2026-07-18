import { describe, expect, it } from 'vitest';

import { parseGmailTransactionAlert } from './gmail-transaction-parser';

describe('parseGmailTransactionAlert', () => {
  it('parses HDFC-style spend alerts', () => {
    const parsed = parseGmailTransactionAlert(
      'Rs.1,250.50 spent on your HDFC Bank Credit Card XX1234 at SWIGGY on 14-07-2026. Not you? Call 1800.',
    );
    expect(parsed).not.toBeNull();
    expect(parsed?.amountInr).toBe(1250.5);
    expect(parsed?.merchantName.toLowerCase()).toContain('swiggy');
    expect(parsed?.bankHint).toBe('hdfc');
  });

  it('parses Axis-style transaction alerts', () => {
    const parsed = parseGmailTransactionAlert(
      'Transaction of INR 899.00 at AMAZON using Axis Bank Credit Card ending 4321 on 12 Jul 2026.',
    );
    expect(parsed?.amountInr).toBe(899);
    expect(parsed?.merchantName.toLowerCase()).toContain('amazon');
    expect(parsed?.bankHint).toBe('axis');
  });

  it('returns null when no amount is present', () => {
    expect(parseGmailTransactionAlert('Your HDFC statement is ready to view.')).toBeNull();
  });

  it('rejects bill / amount-due emails that look like spends', () => {
    expect(
      parseGmailTransactionAlert('Total Amount Due Rs. 16,703 on 20-07-2026 for your HDFC card.'),
    ).toBeNull();
    expect(
      parseGmailTransactionAlert(
        'Amount Due Rs. 16,703 on 18/07/2026. Please pay by the due date.',
      ),
    ).toBeNull();
    expect(
      parseGmailTransactionAlert(
        'Your e-statement is ready. Outstanding balance Rs. 16,703 on your Axis card.',
      ),
    ).toBeNull();
  });

  it('rejects amount-on-date copy without a spend verb or merchant', () => {
    expect(parseGmailTransactionAlert('Rs. 16,703 on 20-07-2026 HDFC Bank Credit Card.')).toBeNull();
  });
});
