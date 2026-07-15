import { describe, expect, it } from 'vitest';

import { assistantActionPath, assistantResultPath } from './assistant-api';

describe('assistant-api paths', () => {
  it('maps card actions to portfolio or add-card routes', () => {
    expect(
      assistantActionPath({
        type: 'VIEW_CARD',
        id: '019f52a4-c692-727d-b386-e925a3c8ae02',
        slug: 'hdfc-millennia',
      }),
    ).toBe('/account/cards/019f52a4-c692-727d-b386-e925a3c8ae02');

    expect(assistantActionPath({ type: 'VIEW_CARD', slug: 'hdfc-millennia' })).toBe(
      '/account/cards/add',
    );
  });

  it('maps merchant actions to merchant routes', () => {
    expect(
      assistantActionPath({
        type: 'VIEW_MERCHANT',
        slug: 'amazon',
        label: 'Amazon',
      }),
    ).toBe('/account/merchants/amazon');
  });

  it('maps structured result cards to deep links', () => {
    expect(
      assistantResultPath({
        kind: 'merchant',
        id: '019f52a4-c692-727d-b386-e925a3c8ae03',
        slug: 'amazon',
        title: 'Amazon',
      }),
    ).toBe('/account/merchants/amazon');

    expect(
      assistantResultPath({
        kind: 'portfolio_card',
        id: '019f52a4-c692-727d-b386-e925a3c8aecc',
        slug: 'hdfc-millennia',
        title: 'HDFC Millennia',
        userCardId: '019f52a4-c692-727d-b386-e925a3c8ae02',
      }),
    ).toBe('/account/cards/019f52a4-c692-727d-b386-e925a3c8ae02');

    expect(
      assistantResultPath({
        kind: 'card',
        id: '019f52a4-c692-727d-b386-e925a3c8aecc',
        slug: 'idfc-first-private',
        title: 'IDFC FIRST Private',
      }),
    ).toBe('/account/cards/add');
  });
});
