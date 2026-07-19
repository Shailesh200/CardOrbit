import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  AnalyticsEvent,
  clearMemoryEvents,
  getMemoryEvents,
  initAnalytics,
  shutdownAnalytics,
  trackEvent,
  trackGmailConnected,
  trackPageViewed,
  trackRecommendationRequested,
  trackUserLoggedIn,
} from './index';

describe('@cardwise/analytics', () => {
  beforeEach(() => {
    clearMemoryEvents();
    initAnalytics({ useMemory: true });
  });

  afterEach(async () => {
    await shutdownAnalytics();
    clearMemoryEvents();
  });

  it('defines required milestone event names', () => {
    expect(AnalyticsEvent.USER_REGISTERED).toBe('USER_REGISTERED');
    expect(AnalyticsEvent.USER_LOGGED_IN).toBe('USER_LOGGED_IN');
    expect(AnalyticsEvent.EMAIL_VERIFIED).toBe('EMAIL_VERIFIED');
    expect(AnalyticsEvent.GMAIL_CONNECTED).toBe('GMAIL_CONNECTED');
    expect(AnalyticsEvent.GMAIL_SYNC_COMPLETED).toBe('GMAIL_SYNC_COMPLETED');
    expect(AnalyticsEvent.MARKETING_CTA_CLICKED).toBe('MARKETING_CTA_CLICKED');
    expect(AnalyticsEvent.PAGE_VIEWED).toBe('PAGE_VIEWED');
    expect(AnalyticsEvent.SESSION_STARTED).toBe('SESSION_STARTED');
    expect(AnalyticsEvent.CARD_ADDED).toBe('CARD_ADDED');
    expect(AnalyticsEvent.RECOMMENDATION_REQUESTED).toBe('RECOMMENDATION_REQUESTED');
    expect(AnalyticsEvent.ONBOARDING_STARTED).toBe('ONBOARDING_STARTED');
    expect(AnalyticsEvent.ONBOARDING_STEP_COMPLETED).toBe('ONBOARDING_STEP_COMPLETED');
    expect(AnalyticsEvent.ONBOARDING_COMPLETED).toBe('ONBOARDING_COMPLETED');
    expect(AnalyticsEvent.ONBOARDING_SKIPPED).toBe('ONBOARDING_SKIPPED');
    expect(AnalyticsEvent.CARD_DATA_GAP).toBe('CARD_DATA_GAP');
    expect(AnalyticsEvent.MERCHANT_DATA_GAP).toBe('MERCHANT_DATA_GAP');
  });

  it('captures ONBOARDING_STEP_COMPLETED via trackEvent', () => {
    trackEvent(AnalyticsEvent.ONBOARDING_STEP_COMPLETED, {
      step: 'WELCOME',
      source: 'test',
    });
    expect(getMemoryEvents()[0]?.event).toBe('ONBOARDING_STEP_COMPLETED');
  });

  it('captures CARD_DATA_GAP via trackCardDataGap', async () => {
    const { trackCardDataGap } = await import('./index');
    trackCardDataGap({
      gapType: 'missing_reward_rule',
      cardId: 'card-1',
      cardSlug: 'hdfc-regalia',
      source: 'test',
    });
    const events = getMemoryEvents();
    expect(events[0]?.event).toBe('CARD_DATA_GAP');
    expect(events[0]?.properties).toMatchObject({
      gapType: 'missing_reward_rule',
      cardId: 'card-1',
    });
  });

  it('captures MERCHANT_DATA_GAP via trackMerchantDataGap', async () => {
    const { trackMerchantDataGap } = await import('./index');
    trackMerchantDataGap({
      gapType: 'failed_search',
      query: 'unknown shop',
      source: 'test',
    });
    const events = getMemoryEvents();
    expect(events[0]?.event).toBe('MERCHANT_DATA_GAP');
    expect(events[0]?.properties).toMatchObject({
      gapType: 'failed_search',
      query: 'unknown shop',
    });
  });

  it('captures USER_REGISTERED via trackEvent', () => {
    const payload = trackEvent(
      AnalyticsEvent.USER_REGISTERED,
      {
        method: 'email',
        source: 'test-harness',
      },
      { distinctId: 'user_test_1' },
    );

    expect(payload.event).toBe('USER_REGISTERED');
    expect(getMemoryEvents()).toHaveLength(1);
    expect(getMemoryEvents()[0]?.event).toBe('USER_REGISTERED');
  });

  it('captures USER_LOGGED_IN and GMAIL_CONNECTED via helpers', () => {
    trackUserLoggedIn(
      { method: 'google', isReturning: false, surface: 'api' },
      { distinctId: 'user_1' },
    );
    trackGmailConnected(
      { isPrimary: true, mailboxCount: 1, source: 'oauth_login_upsert' },
      { distinctId: 'user_1' },
    );
    const events = getMemoryEvents().map((e) => e.event);
    expect(events).toEqual(['USER_LOGGED_IN', 'GMAIL_CONNECTED']);
  });

  it('captures PAGE_VIEWED via helper', () => {
    trackPageViewed(
      {
        path: '/account/cards',
        host: 'app',
        isAuthenticated: true,
        search: 'utm_source',
      },
      { distinctId: 'user_1' },
    );
    expect(getMemoryEvents()[0]?.event).toBe('PAGE_VIEWED');
    expect(getMemoryEvents()[0]?.properties).toMatchObject({
      path: '/account/cards',
      host: 'app',
      isAuthenticated: true,
    });
  });

  it('captures CARD_ADDED via trackEvent', () => {
    trackEvent(AnalyticsEvent.CARD_ADDED, { cardId: 'card_amex_plat', bankId: 'amex' });
    expect(getMemoryEvents()[0]?.properties).toMatchObject({ cardId: 'card_amex_plat' });
  });

  it('captures RECOMMENDATION_REQUESTED via helper', () => {
    trackRecommendationRequested({
      merchantName: 'Swiggy',
      category: 'food',
      amount: 500,
      availableCardIds: ['card_1', 'card_2'],
    });

    const events = getMemoryEvents();
    expect(events).toHaveLength(1);
    expect(events[0]?.event).toBe('RECOMMENDATION_REQUESTED');
  });

  it('forwards events through a custom transport (PostHog capture simulation)', () => {
    const captured: string[] = [];
    initAnalytics({
      transport: {
        capture(event) {
          captured.push(event.event);
        },
      },
    });

    trackEvent(AnalyticsEvent.USER_REGISTERED, { method: 'google' });
    expect(captured).toEqual(['USER_REGISTERED']);
  });
});
