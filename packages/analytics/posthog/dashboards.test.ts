import { describe, expect, it } from 'vitest';

import { AnalyticsEvent } from '../src/events';
import { CARDWISE_DASHBOARDS, collectDashboardEventNames } from './dashboards';

const catalogEvents = new Set<string>(Object.values(AnalyticsEvent));

describe('PostHog dashboards (M-023 / M-034)', () => {
  it('defines seven CardWise dashboards', () => {
    expect(CARDWISE_DASHBOARDS).toHaveLength(7);
    expect(CARDWISE_DASHBOARDS.map((row) => row.key)).toEqual([
      'user-metrics',
      'recommendation-quality',
      'merchant-intelligence',
      'card-intelligence',
      'extension-telemetry',
      'feature-adoption',
      'traffic',
    ]);
  });

  it('uses only @cardwise/analytics catalog events', () => {
    const used = collectDashboardEventNames();
    for (const event of used) {
      expect(catalogEvents.has(event), `Unknown event in dashboard: ${event}`).toBe(true);
    }
  });

  it('includes failed search and data gap signals', () => {
    const merchantDashboard = CARDWISE_DASHBOARDS.find((row) => row.key === 'merchant-intelligence');
    const cardDashboard = CARDWISE_DASHBOARDS.find((row) => row.key === 'card-intelligence');

    expect(
      merchantDashboard?.insights.some((row) => row.name.includes('Failed merchant searches')),
    ).toBe(true);
    expect(cardDashboard?.insights.some((row) => row.events.includes(AnalyticsEvent.CARD_DATA_GAP))).toBe(
      true,
    );
  });

  it('each insight has a PostHog query payload', () => {
    for (const dashboard of CARDWISE_DASHBOARDS) {
      for (const insight of dashboard.insights) {
        expect(insight.query.kind).toBe('InsightVizNode');
        expect(insight.query.source.kind).toBeTruthy();
      }
    }
  });
});
