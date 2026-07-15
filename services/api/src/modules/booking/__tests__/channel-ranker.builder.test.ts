import { describe, expect, it } from 'vitest';

import { ISSUER_TRAVEL_PORTALS, listActivePortals } from '@cardwise/validation';
import {
  buildChannelRecommendResult,
  buildDeepLinkUrl,
  estimatePortalEconomics,
  matchPortalCard,
  rankPortalChannels,
} from '../channel-ranker.builder';

describe('issuer travel portal catalog', () => {
  it('seeds at least 12 active portals covering flights and hotels', () => {
    expect(ISSUER_TRAVEL_PORTALS.length).toBeGreaterThanOrEqual(12);
    expect(listActivePortals('FLIGHT').length).toBeGreaterThanOrEqual(12);
    expect(listActivePortals('HOTEL').every((p) => p.products.includes('HOTEL'))).toBe(true);
  });
});

describe('channel ranker', () => {
  const smartbuy = ISSUER_TRAVEL_PORTALS.find((p) => p.slug === 'hdfc-smartbuy')!;

  it('builds deep links from templates and falls back to baseUrl', () => {
    const linked = buildDeepLinkUrl(smartbuy, {
      product: 'FLIGHT',
      origin: 'BLR',
      destination: 'DEL',
      departureDate: '2026-12-01',
    });
    expect(linked.url).toContain('smartbuy.hdfcbank.com');
    expect(linked.url).toContain('BLR');
    expect(linked.searchHint).toContain('BLR → DEL');

    const axis = ISSUER_TRAVEL_PORTALS.find((p) => p.slug === 'axis-travel-edge')!;
    const fallback = buildDeepLinkUrl(axis, { product: 'HOTEL', destination: 'GOA' });
    expect(fallback.url).toBe(axis.baseUrl);
    expect(fallback.searchHint).toContain('GOA');
  });

  it('estimates acceleration lift vs baseline OTA earn', () => {
    const economics = estimatePortalEconomics(smartbuy, 20_000);
    expect(economics.estimatedRewardValueInr).toBeGreaterThan(economics.baselineRewardValueInr);
    expect(economics.estimatedAccelerationLiftInr).toBeGreaterThan(0);
    expect(economics.estimatedEffectiveCostInr).toBe(20_000 - economics.estimatedRewardValueInr);
  });

  it('matches portfolio cards by bank / hints', () => {
    const matched = matchPortalCard(smartbuy, [
      { userCardId: 'uc-1', cardName: 'Regalia Gold', bankName: 'HDFC Bank', bankSlug: 'hdfc' },
      { userCardId: 'uc-2', cardName: 'Magnus', bankName: 'Axis Bank', bankSlug: 'axis' },
    ]);
    expect(matched?.userCardId).toBe('uc-1');
  });

  it('ranks SmartBuy ahead when portfolio has HDFC and gross is equal', () => {
    const ranked = rankPortalChannels({
      product: 'FLIGHT',
      recommendInput: {
        product: 'FLIGHT',
        origin: 'BLR',
        destination: 'DEL',
        departureDate: '2026-12-01',
        estimatedGrossInr: 25_000,
      },
      context: {
        cards: [
          {
            userCardId: 'uc-1',
            cardName: 'Diners Black',
            bankName: 'HDFC Bank',
            bankSlug: 'hdfc',
          },
        ],
      },
    });
    expect(ranked[0]?.slug).toBe('hdfc-smartbuy');
    expect(ranked[0]?.portfolioMatch).toBe(true);
    expect(ranked[0]?.requiresExternalBooking).toBe(true);
  });

  it('builds combined recommend result with disclosure and direct channel', () => {
    const result = buildChannelRecommendResult({
      product: 'FLIGHT',
      recommendInput: {
        product: 'FLIGHT',
        origin: 'BLR',
        destination: 'DEL',
        departureDate: '2026-12-01',
        estimatedGrossInr: 25_000,
      },
      context: {
        cards: [
          {
            userCardId: 'uc-1',
            cardName: 'Regalia Gold',
            bankName: 'HDFC Bank',
            bankSlug: 'hdfc',
          },
        ],
      },
      directEffectiveCostInr: 22_000,
      recommendedUserCardId: 'uc-1',
      recommendedCardName: 'Regalia Gold',
      generatedAt: new Date('2026-07-14T00:00:00.000Z'),
    });

    expect(result.disclosure.toLowerCase()).toContain('bank portal');
    expect(result.directChannel?.kind).toBe('DIRECT');
    expect(result.channels.some((c) => c.kind === 'PORTAL_HANDOFF')).toBe(true);
    expect(result.channelCount).toBeGreaterThan(1);
    expect(result.generatedAt).toBe('2026-07-14T00:00:00.000Z');
  });
});
