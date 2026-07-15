import { AnalyticsEvent } from '../src/events';

export type PostHogPropertyFilter = {
  key: string;
  type: 'event';
  value: string[];
  operator: 'exact' | 'is_not';
};

export type PostHogInsightQuery = {
  kind: 'InsightVizNode';
  source: Record<string, unknown>;
};

export type PostHogInsightDefinition = {
  name: string;
  description: string;
  events: string[];
  query: PostHogInsightQuery;
};

export type PostHogDashboardDefinition = {
  key: string;
  name: string;
  description: string;
  tags: string[];
  insights: PostHogInsightDefinition[];
};

const DATE_RANGE_30D = { date_from: '-30d' };
const DATE_RANGE_90D = { date_from: '-90d' };

function eventNode(
  event: string,
  opts?: {
    math?: 'total' | 'dau' | 'avg';
    properties?: PostHogPropertyFilter[];
    mathProperty?: string;
  },
) {
  return {
    kind: 'EventsNode',
    event,
    ...(opts?.math ? { math: opts.math } : {}),
    ...(opts?.mathProperty ? { math_property: opts.mathProperty } : {}),
    ...(opts?.properties?.length ? { properties: opts.properties } : {}),
  };
}

function trendsQuery(
  series: ReturnType<typeof eventNode>[],
  opts?: { interval?: 'day' | 'week' | 'month'; breakdown?: string; dateRange?: typeof DATE_RANGE_30D },
): PostHogInsightQuery {
  return {
    kind: 'InsightVizNode',
    source: {
      kind: 'TrendsQuery',
      series,
      interval: opts?.interval ?? 'day',
      dateRange: opts?.dateRange ?? DATE_RANGE_30D,
      ...(opts?.breakdown
        ? {
            breakdownFilter: {
              breakdown_type: 'event',
              breakdown: opts.breakdown,
            },
          }
        : {}),
    },
  };
}

function retentionQuery(
  targetEvent: string,
  returningEvent: string,
): PostHogInsightQuery {
  return {
    kind: 'InsightVizNode',
    source: {
      kind: 'RetentionQuery',
      dateRange: DATE_RANGE_90D,
      retentionFilter: {
        targetEntityType: 'events',
        targetEvent,
        returningEntityType: 'events',
        returningEvent,
        totalIntervals: 8,
        period: 'Week',
      },
    },
  };
}

function exactProperty(key: string, value: string): PostHogPropertyFilter {
  return { key, type: 'event', value: [value], operator: 'exact' };
}

export const CARDWISE_DASHBOARDS: PostHogDashboardDefinition[] = [
  {
    key: 'user-metrics',
    name: 'CardWise — User Metrics',
    description:
      'Phase 1 user adoption and engagement. [cardwise-dashboard:user-metrics] Events: USER_REGISTERED, CARD_ADDED, ONBOARDING_*.',
    tags: ['cardwise', 'm-023', 'user-metrics'],
    insights: [
      {
        name: 'Daily active users (core events)',
        description: 'Unique users performing any core product action per day.',
        events: [
          AnalyticsEvent.USER_REGISTERED,
          AnalyticsEvent.CARD_ADDED,
          AnalyticsEvent.MERCHANT_SEARCHED,
          AnalyticsEvent.RECOMMENDATION_REQUESTED,
        ],
        query: trendsQuery(
          [
            eventNode(AnalyticsEvent.USER_REGISTERED, { math: 'dau' }),
            eventNode(AnalyticsEvent.CARD_ADDED, { math: 'dau' }),
            eventNode(AnalyticsEvent.MERCHANT_SEARCHED, { math: 'dau' }),
            eventNode(AnalyticsEvent.RECOMMENDATION_REQUESTED, { math: 'dau' }),
          ],
        ),
      },
      {
        name: 'Monthly active users (recommendations)',
        description: 'Users requesting recommendations in the last 30 days.',
        events: [AnalyticsEvent.RECOMMENDATION_REQUESTED],
        query: trendsQuery([eventNode(AnalyticsEvent.RECOMMENDATION_REQUESTED, { math: 'dau' })], {
          interval: 'month',
        }),
      },
      {
        name: 'New registrations',
        description: 'USER_REGISTERED volume by signup method.',
        events: [AnalyticsEvent.USER_REGISTERED],
        query: trendsQuery([eventNode(AnalyticsEvent.USER_REGISTERED)], {
          breakdown: 'method',
        }),
      },
      {
        name: 'Cards added to portfolios',
        description: 'CARD_ADDED trend — portfolio adoption.',
        events: [AnalyticsEvent.CARD_ADDED],
        query: trendsQuery([eventNode(AnalyticsEvent.CARD_ADDED)]),
      },
      {
        name: 'Portfolio depth (cards added by card)',
        description: 'Which catalog cards users add most often.',
        events: [AnalyticsEvent.CARD_ADDED],
        query: trendsQuery([eventNode(AnalyticsEvent.CARD_ADDED)], { breakdown: 'cardId' }),
      },
      {
        name: 'Onboarding completion funnel',
        description: 'Onboarding started vs completed.',
        events: [
          AnalyticsEvent.ONBOARDING_STARTED,
          AnalyticsEvent.ONBOARDING_COMPLETED,
          AnalyticsEvent.ONBOARDING_SKIPPED,
        ],
        query: trendsQuery([
          eventNode(AnalyticsEvent.ONBOARDING_STARTED),
          eventNode(AnalyticsEvent.ONBOARDING_COMPLETED),
          eventNode(AnalyticsEvent.ONBOARDING_SKIPPED),
        ]),
      },
      {
        name: 'Weekly retention (signup → recommendation)',
        description: 'Users returning to request recommendations after registration.',
        events: [AnalyticsEvent.USER_REGISTERED, AnalyticsEvent.RECOMMENDATION_REQUESTED],
        query: retentionQuery(
          AnalyticsEvent.USER_REGISTERED,
          AnalyticsEvent.RECOMMENDATION_REQUESTED,
        ),
      },
    ],
  },
  {
    key: 'recommendation-quality',
    name: 'CardWise — Recommendation Quality',
    description:
      'Recommendation volume, exposure, and trust signals. [cardwise-dashboard:recommendation-quality]',
    tags: ['cardwise', 'm-023', 'recommendation-quality'],
    insights: [
      {
        name: 'Recommendations requested',
        description: 'RECOMMENDATION_REQUESTED volume.',
        events: [AnalyticsEvent.RECOMMENDATION_REQUESTED],
        query: trendsQuery([eventNode(AnalyticsEvent.RECOMMENDATION_REQUESTED)]),
      },
      {
        name: 'Recommendations viewed',
        description: 'RECOMMENDATION_VIEWED — recommendations displayed to users.',
        events: [AnalyticsEvent.RECOMMENDATION_VIEWED],
        query: trendsQuery([eventNode(AnalyticsEvent.RECOMMENDATION_VIEWED)]),
      },
      {
        name: 'Recommendation clicks by action',
        description: 'Accepted vs dismissed vs ignored (RECOMMENDATION_CLICKED).',
        events: [AnalyticsEvent.RECOMMENDATION_CLICKED],
        query: trendsQuery([eventNode(AnalyticsEvent.RECOMMENDATION_CLICKED)], {
          breakdown: 'action',
        }),
      },
      {
        name: 'Acceptance rate (accepted clicks)',
        description: 'Users clicking accept on a recommendation.',
        events: [AnalyticsEvent.RECOMMENDATION_CLICKED],
        query: trendsQuery([
          eventNode(AnalyticsEvent.RECOMMENDATION_CLICKED, {
            properties: [exactProperty('action', 'accepted')],
          }),
        ]),
      },
      {
        name: 'Dismissed recommendations',
        description: 'Trust gap signal — users dismissing recommendations.',
        events: [AnalyticsEvent.RECOMMENDATION_CLICKED],
        query: trendsQuery([
          eventNode(AnalyticsEvent.RECOMMENDATION_CLICKED, {
            properties: [exactProperty('action', 'dismissed')],
          }),
        ]),
      },
      {
        name: 'Average expected reward (INR)',
        description: 'Mean expectedReward on RECOMMENDATION_VIEWED.',
        events: [AnalyticsEvent.RECOMMENDATION_VIEWED],
        query: trendsQuery([
          eventNode(AnalyticsEvent.RECOMMENDATION_VIEWED, {
            math: 'avg',
            mathProperty: 'expectedReward',
          }),
        ]),
      },
      {
        name: 'Most recommended cards',
        description: 'Breakdown of recommendedCardId on viewed recommendations.',
        events: [AnalyticsEvent.RECOMMENDATION_VIEWED],
        query: trendsQuery([eventNode(AnalyticsEvent.RECOMMENDATION_VIEWED)], {
          breakdown: 'recommendedCardId',
        }),
      },
    ],
  },
  {
    key: 'merchant-intelligence',
    name: 'CardWise — Merchant Intelligence',
    description:
      'Search demand and catalog gaps. [cardwise-dashboard:merchant-intelligence]',
    tags: ['cardwise', 'm-023', 'merchant-intelligence'],
    insights: [
      {
        name: 'Merchant searches',
        description: 'MERCHANT_SEARCHED volume.',
        events: [AnalyticsEvent.MERCHANT_SEARCHED],
        query: trendsQuery([eventNode(AnalyticsEvent.MERCHANT_SEARCHED)]),
      },
      {
        name: 'Failed merchant searches (zero results)',
        description: 'Searches with resultCount=0 — missing merchant triage.',
        events: [AnalyticsEvent.MERCHANT_SEARCHED],
        query: trendsQuery([
          eventNode(AnalyticsEvent.MERCHANT_SEARCHED, {
            properties: [exactProperty('resultCount', '0')],
          }),
        ]),
      },
      {
        name: 'Failed search queries',
        description: 'Top queries returning zero merchants.',
        events: [AnalyticsEvent.MERCHANT_SEARCHED],
        query: trendsQuery(
          [
            eventNode(AnalyticsEvent.MERCHANT_SEARCHED, {
              properties: [exactProperty('resultCount', '0')],
            }),
          ],
          { breakdown: 'query' },
        ),
      },
      {
        name: 'Top searched merchants (queries with results)',
        description: 'Demand signal from successful searches.',
        events: [AnalyticsEvent.MERCHANT_SEARCHED],
        query: trendsQuery([eventNode(AnalyticsEvent.MERCHANT_SEARCHED)], { breakdown: 'query' }),
      },
      {
        name: 'Search result coverage (avg results)',
        description: 'Average resultCount per search.',
        events: [AnalyticsEvent.MERCHANT_SEARCHED],
        query: trendsQuery([
          eventNode(AnalyticsEvent.MERCHANT_SEARCHED, {
            math: 'avg',
            mathProperty: 'resultCount',
          }),
        ]),
      },
      {
        name: 'Recommendations by merchant',
        description: 'Recommendation requests grouped by merchantName.',
        events: [AnalyticsEvent.RECOMMENDATION_REQUESTED],
        query: trendsQuery([eventNode(AnalyticsEvent.RECOMMENDATION_REQUESTED)], {
          breakdown: 'merchantName',
        }),
      },
      {
        name: 'Merchant data gaps (all types)',
        description: 'MERCHANT_DATA_GAP volume for catalog/mapping triage (M-025).',
        events: [AnalyticsEvent.MERCHANT_DATA_GAP],
        query: trendsQuery([eventNode(AnalyticsEvent.MERCHANT_DATA_GAP)]),
      },
      {
        name: 'Failed search data gaps',
        description: 'MERCHANT_DATA_GAP where gapType=failed_search.',
        events: [AnalyticsEvent.MERCHANT_DATA_GAP],
        query: trendsQuery([
          eventNode(AnalyticsEvent.MERCHANT_DATA_GAP, {
            properties: [exactProperty('gapType', 'failed_search')],
          }),
        ]),
      },
      {
        name: 'Merchant data gaps by query',
        description: 'Failed-search gaps broken down by query text.',
        events: [AnalyticsEvent.MERCHANT_DATA_GAP],
        query: trendsQuery(
          [
            eventNode(AnalyticsEvent.MERCHANT_DATA_GAP, {
              properties: [exactProperty('gapType', 'failed_search')],
            }),
          ],
          { breakdown: 'query' },
        ),
      },
    ],
  },
  {
    key: 'card-intelligence',
    name: 'CardWise — Card Intelligence',
    description:
      'Portfolio demand, engine bias, and data foundation gaps. [cardwise-dashboard:card-intelligence]',
    tags: ['cardwise', 'm-023', 'card-intelligence'],
    insights: [
      {
        name: 'Most added cards',
        description: 'CARD_ADDED breakdown by cardId.',
        events: [AnalyticsEvent.CARD_ADDED],
        query: trendsQuery([eventNode(AnalyticsEvent.CARD_ADDED)], { breakdown: 'cardId' }),
      },
      {
        name: 'Most recommended cards (viewed)',
        description: 'Engine output distribution.',
        events: [AnalyticsEvent.RECOMMENDATION_VIEWED],
        query: trendsQuery([eventNode(AnalyticsEvent.RECOMMENDATION_VIEWED)], {
          breakdown: 'recommendedCardId',
        }),
      },
      {
        name: 'Dismissed recommendations by card',
        description: 'Cards users reject — underperforming recommendations.',
        events: [AnalyticsEvent.RECOMMENDATION_CLICKED],
        query: trendsQuery(
          [
            eventNode(AnalyticsEvent.RECOMMENDATION_CLICKED, {
              properties: [exactProperty('action', 'dismissed')],
            }),
          ],
          { breakdown: 'recommendedCardId' },
        ),
      },
      {
        name: 'Missing reward rules (data gaps)',
        description: 'CARD_DATA_GAP where gapType=missing_reward_rule.',
        events: [AnalyticsEvent.CARD_DATA_GAP],
        query: trendsQuery([
          eventNode(AnalyticsEvent.CARD_DATA_GAP, {
            properties: [exactProperty('gapType', 'missing_reward_rule')],
          }),
        ]),
      },
      {
        name: 'Missing benefit data (data gaps)',
        description: 'CARD_DATA_GAP where gapType=missing_benefit_data.',
        events: [AnalyticsEvent.CARD_DATA_GAP],
        query: trendsQuery([
          eventNode(AnalyticsEvent.CARD_DATA_GAP, {
            properties: [exactProperty('gapType', 'missing_benefit_data')],
          }),
        ]),
      },
      {
        name: 'Data gaps by card',
        description: 'Cards needing catalog work — breakdown by cardSlug.',
        events: [AnalyticsEvent.CARD_DATA_GAP],
        query: trendsQuery([eventNode(AnalyticsEvent.CARD_DATA_GAP)], { breakdown: 'cardSlug' }),
      },
      {
        name: 'Cards removed from portfolios',
        description: 'CARD_REMOVED trend.',
        events: [AnalyticsEvent.CARD_REMOVED],
        query: trendsQuery([eventNode(AnalyticsEvent.CARD_REMOVED)]),
      },
    ],
  },
  {
    key: 'extension-telemetry',
    name: 'CardWise — Extension Telemetry',
    description:
      'Browser extension adoption and overlay engagement. [cardwise-dashboard:extension-telemetry]',
    tags: ['cardwise', 'm-034', 'extension'],
    insights: [
      {
        name: 'Extension opened (popup + overlay)',
        description: 'EXTENSION_OPENED volume by surface.',
        events: [AnalyticsEvent.EXTENSION_OPENED],
        query: trendsQuery([eventNode(AnalyticsEvent.EXTENSION_OPENED)], { breakdown: 'surface' }),
      },
      {
        name: 'Supported merchants detected',
        description: 'EXTENSION_MERCHANT_DETECTED — auto-detect coverage.',
        events: [AnalyticsEvent.EXTENSION_MERCHANT_DETECTED],
        query: trendsQuery([eventNode(AnalyticsEvent.EXTENSION_MERCHANT_DETECTED)]),
      },
      {
        name: 'Overlay recommendations viewed',
        description: 'EXTENSION_OVERLAY_VIEWED with recommendation shown.',
        events: [AnalyticsEvent.EXTENSION_OVERLAY_VIEWED],
        query: trendsQuery([eventNode(AnalyticsEvent.EXTENSION_OVERLAY_VIEWED)]),
      },
      {
        name: 'Checkout amount detected',
        description: 'Overlays where amountDetected=true.',
        events: [AnalyticsEvent.EXTENSION_OVERLAY_VIEWED],
        query: trendsQuery([
          eventNode(AnalyticsEvent.EXTENSION_OVERLAY_VIEWED, {
            properties: [exactProperty('amountDetected', 'true')],
          }),
        ]),
      },
      {
        name: 'Overlay interactions',
        description: 'EXTENSION_OVERLAY_INTERACTION by action.',
        events: [AnalyticsEvent.EXTENSION_OVERLAY_INTERACTION],
        query: trendsQuery([eventNode(AnalyticsEvent.EXTENSION_OVERLAY_INTERACTION)], {
          breakdown: 'action',
        }),
      },
      {
        name: 'Extension feedback (helpful)',
        description: 'Positive overlay feedback signals.',
        events: [AnalyticsEvent.EXTENSION_OVERLAY_INTERACTION],
        query: trendsQuery([
          eventNode(AnalyticsEvent.EXTENSION_OVERLAY_INTERACTION, {
            properties: [exactProperty('action', 'feedback_helpful')],
          }),
        ]),
      },
      {
        name: 'Top merchants (overlay views)',
        description: 'Overlay views grouped by merchantSlug.',
        events: [AnalyticsEvent.EXTENSION_OVERLAY_VIEWED],
        query: trendsQuery([eventNode(AnalyticsEvent.EXTENSION_OVERLAY_VIEWED)], {
          breakdown: 'merchantSlug',
        }),
      },
    ],
  },
  {
    key: 'feature-adoption',
    name: 'CardWise — Feature Adoption & Experiments',
    description:
      'Phase 2 personalization adoption and experiment exposure funnels. [cardwise-dashboard:feature-adoption]',
    tags: ['cardwise', 'm-034', 'feature-adoption'],
    insights: [
      {
        name: 'Recommendation feedback submitted',
        description: 'RECOMMENDATION_FEEDBACK_SUBMITTED by feedback type.',
        events: [AnalyticsEvent.RECOMMENDATION_FEEDBACK_SUBMITTED],
        query: trendsQuery([eventNode(AnalyticsEvent.RECOMMENDATION_FEEDBACK_SUBMITTED)], {
          breakdown: 'feedbackType',
        }),
      },
      {
        name: 'Alternative cards selected',
        description: 'Users choosing a non-primary recommendation.',
        events: [AnalyticsEvent.ALTERNATIVE_CARD_SELECTED],
        query: trendsQuery([eventNode(AnalyticsEvent.ALTERNATIVE_CARD_SELECTED)]),
      },
      {
        name: 'Merchants favorited',
        description: 'MERCHANT_FAVORITED adoption.',
        events: [AnalyticsEvent.MERCHANT_FAVORITED],
        query: trendsQuery([eventNode(AnalyticsEvent.MERCHANT_FAVORITED)]),
      },
      {
        name: 'Saved searches created',
        description: 'SAVED_SEARCH_CREATED volume.',
        events: [AnalyticsEvent.SAVED_SEARCH_CREATED],
        query: trendsQuery([eventNode(AnalyticsEvent.SAVED_SEARCH_CREATED)]),
      },
      {
        name: 'Saved searches run',
        description: 'SAVED_SEARCH_RUN — repeat usage.',
        events: [AnalyticsEvent.SAVED_SEARCH_RUN],
        query: trendsQuery([eventNode(AnalyticsEvent.SAVED_SEARCH_RUN)]),
      },
      {
        name: 'Dashboard widget interactions',
        description: 'DASHBOARD_WIDGET_INTERACTION by widget and action.',
        events: [AnalyticsEvent.DASHBOARD_WIDGET_INTERACTION],
        query: trendsQuery([eventNode(AnalyticsEvent.DASHBOARD_WIDGET_INTERACTION)], {
          breakdown: 'widgetId',
        }),
      },
      {
        name: 'Experiment exposures',
        description: 'EXPERIMENT_EXPOSED by experiment key.',
        events: [AnalyticsEvent.EXPERIMENT_EXPOSED],
        query: trendsQuery([eventNode(AnalyticsEvent.EXPERIMENT_EXPOSED)], {
          breakdown: 'experimentKey',
        }),
      },
      {
        name: 'Experiment variant distribution',
        description: 'Variant assignment breakdown for A/B analysis.',
        events: [AnalyticsEvent.EXPERIMENT_EXPOSED],
        query: trendsQuery([eventNode(AnalyticsEvent.EXPERIMENT_EXPOSED)], {
          breakdown: 'variant',
        }),
      },
      {
        name: 'Feedback funnel (viewed → feedback)',
        description: 'Recommendation viewed vs feedback submitted.',
        events: [
          AnalyticsEvent.RECOMMENDATION_VIEWED,
          AnalyticsEvent.RECOMMENDATION_FEEDBACK_SUBMITTED,
        ],
        query: trendsQuery([
          eventNode(AnalyticsEvent.RECOMMENDATION_VIEWED),
          eventNode(AnalyticsEvent.RECOMMENDATION_FEEDBACK_SUBMITTED),
        ]),
      },
    ],
  },
];

export function collectDashboardEventNames(): string[] {
  return [...new Set(CARDWISE_DASHBOARDS.flatMap((dashboard) => dashboard.insights.flatMap((i) => i.events)))];
}
