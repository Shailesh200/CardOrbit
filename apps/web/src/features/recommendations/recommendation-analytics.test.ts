import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  trackRecommendationClickedClient,
  trackRecommendationViewedClient,
} from './recommendation-analytics';

vi.mock('posthog-js', () => ({
  default: { capture: vi.fn(), init: vi.fn(), identify: vi.fn(), reset: vi.fn() },
}));

describe('recommendation-analytics (M-020)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs RECOMMENDATION_VIEWED in development', () => {
    trackRecommendationViewedClient({
      merchantId: 'm1',
      merchantName: 'Swiggy',
      amount: 1000,
      recommendedCardId: 'card-1',
      expectedReward: 50,
    });

    expect(console.debug).toHaveBeenCalledWith(
      '[analytics]',
      expect.objectContaining({
        event: 'RECOMMENDATION_VIEWED',
        properties: expect.objectContaining({ recommendedCardId: 'card-1' }),
      }),
    );
  });

  it('logs RECOMMENDATION_CLICKED in development', () => {
    trackRecommendationClickedClient({
      merchantId: 'm1',
      merchantName: 'Swiggy',
      amount: 1000,
      recommendedCardId: 'card-2',
      expectedReward: 40,
      clickedCardId: 'card-2',
      action: 'accepted',
    });

    expect(console.debug).toHaveBeenCalledWith(
      '[analytics]',
      expect.objectContaining({
        event: 'RECOMMENDATION_CLICKED',
      }),
    );
  });
});
