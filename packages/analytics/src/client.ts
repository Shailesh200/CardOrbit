import { PostHog } from 'posthog-node';

import type { AnalyticsEventName, EventPropertiesMap, TrackedEvent } from './events';

export type AnalyticsTransport = {
  capture: <E extends AnalyticsEventName>(event: TrackedEvent<E>) => void | Promise<void>;
  flush?: () => Promise<void>;
  shutdown?: () => Promise<void>;
};

export type AnalyticsClientConfig = {
  apiKey?: string;
  host?: string;
  /** When true (default in development without apiKey), capture to an in-memory sink. */
  useMemory?: boolean;
  transport?: AnalyticsTransport;
};

const memoryEvents: TrackedEvent[] = [];
let client: AnalyticsTransport | null = null;
let configured = false;

export function getMemoryEvents(): readonly TrackedEvent[] {
  return memoryEvents;
}

export function clearMemoryEvents(): void {
  memoryEvents.length = 0;
}

function createMemoryTransport(): AnalyticsTransport {
  return {
    capture(event) {
      memoryEvents.push(event);
    },
  };
}

function createPostHogTransport(apiKey: string, host: string): AnalyticsTransport {
  const posthog = new PostHog(apiKey, {
    host,
    flushAt: 1,
    flushInterval: 0,
  });

  return {
    capture(event) {
      posthog.capture({
        distinctId: event.distinctId ?? 'anonymous',
        event: event.event,
        properties: event.properties as Record<string, unknown>,
        timestamp: new Date(event.timestamp),
      });
    },
    async flush() {
      await posthog.flush();
    },
    async shutdown() {
      await posthog.shutdown();
    },
  };
}

/**
 * Initialize analytics once at app/service bootstrap.
 * Without POSTHOG_API_KEY, events go to an in-memory transport (local/tests).
 */
export function initAnalytics(config: AnalyticsClientConfig = {}): void {
  const apiKey = config.apiKey ?? process.env.POSTHOG_API_KEY ?? '';
  const host = config.host ?? process.env.POSTHOG_HOST ?? 'https://app.posthog.com';
  const preferMemory = config.useMemory === true || !apiKey || process.env.NODE_ENV === 'test';

  if (config.transport) {
    client = config.transport;
  } else if (apiKey && !preferMemory) {
    client = createPostHogTransport(apiKey, host);
  } else {
    client = createMemoryTransport();
  }

  configured = true;
}

export function getAnalyticsClient(): AnalyticsTransport {
  if (!configured || !client) {
    initAnalytics();
  }
  return client!;
}

export function isAnalyticsConfigured(): boolean {
  return configured;
}

export async function flushAnalytics(): Promise<void> {
  await getAnalyticsClient().flush?.();
}

export async function shutdownAnalytics(): Promise<void> {
  await getAnalyticsClient().shutdown?.();
  client = null;
  configured = false;
}

export type { AnalyticsEventName, EventPropertiesMap };
