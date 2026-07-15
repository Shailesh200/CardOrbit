#!/usr/bin/env bun
/**
 * Sync CardWise Phase 1 PostHog dashboards (M-023).
 *
 * Requires:
 *   POSTHOG_PERSONAL_API_KEY — PostHog personal API key with insight/dashboard write
 *   POSTHOG_PROJECT_ID       — Numeric project ID from PostHog project settings
 *   POSTHOG_HOST             — Optional, defaults to https://app.posthog.com
 *
 * Usage:
 *   bun run analytics:sync-dashboards
 *   bun run analytics:sync-dashboards -- --dry-run
 */

import { CARDWISE_DASHBOARDS, type PostHogDashboardDefinition } from './dashboards';

type PostHogDashboard = { id: number; name: string; description?: string };
type PostHogInsight = { id: number; name: string; short_id?: string };

const dryRun = process.argv.includes('--dry-run');
const host = (process.env.POSTHOG_HOST ?? 'https://app.posthog.com').replace(/\/$/, '');
const apiKey = process.env.POSTHOG_PERSONAL_API_KEY ?? process.env.POSTHOG_API_KEY ?? '';
const projectId = process.env.POSTHOG_PROJECT_ID ?? '';

function requireConfig(): { host: string; apiKey: string; projectId: string } {
  if (!apiKey) {
    throw new Error('POSTHOG_PERSONAL_API_KEY (or POSTHOG_API_KEY) is required');
  }
  if (!projectId) {
    throw new Error('POSTHOG_PROJECT_ID is required');
  }
  return { host, apiKey, projectId };
}

async function phFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { apiKey, host, projectId } = requireConfig();
  const url = `${host}/api/projects/${projectId}${path}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`PostHog ${init.method ?? 'GET'} ${path} failed (${response.status}): ${body}`);
  }

  return (await response.json()) as T;
}

async function listDashboards(): Promise<PostHogDashboard[]> {
  const data = await phFetch<{ results: PostHogDashboard[] }>('/dashboards/?limit=100');
  return data.results ?? [];
}

async function findDashboard(def: PostHogDashboardDefinition): Promise<PostHogDashboard | undefined> {
  const dashboards = await listDashboards();
  const marker = `[cardwise-dashboard:${def.key}]`;
  return dashboards.find(
    (row) => row.name === def.name || (row.description?.includes(marker) ?? false),
  );
}

async function createDashboard(def: PostHogDashboardDefinition): Promise<PostHogDashboard> {
  if (dryRun) {
    console.log(`[dry-run] create dashboard: ${def.name}`);
    return { id: -1, name: def.name, description: def.description };
  }
  return phFetch<PostHogDashboard>('/dashboards/', {
    method: 'POST',
    body: JSON.stringify({
      name: def.name,
      description: def.description,
      tags: def.tags,
    }),
  });
}

async function createInsight(
  dashboardId: number,
  insight: PostHogDashboardDefinition['insights'][number],
): Promise<PostHogInsight> {
  if (dryRun) {
    console.log(`[dry-run]   insight: ${insight.name}`);
    return { id: -1, name: insight.name };
  }
  return phFetch<PostHogInsight>('/insights/', {
    method: 'POST',
    body: JSON.stringify({
      name: insight.name,
      description: insight.description,
      query: insight.query,
      dashboards: dashboardId > 0 ? [dashboardId] : [],
      saved: true,
    }),
  });
}

async function syncDashboard(def: PostHogDashboardDefinition): Promise<void> {
  let dashboard = await findDashboard(def);
  if (!dashboard) {
    dashboard = await createDashboard(def);
    console.log(`Created dashboard: ${def.name} (#${dashboard.id})`);
  } else {
    console.log(`Dashboard exists: ${def.name} (#${dashboard.id})`);
  }

  for (const insight of def.insights) {
    await createInsight(dashboard.id, insight);
    console.log(`  + ${insight.name}`);
  }
}

async function main(): Promise<void> {
  console.log(`CardWise PostHog dashboard sync (${dryRun ? 'dry-run' : 'live'})`);
  console.log(`Host: ${host}  Project: ${projectId || '(unset)'}`);

  if (!apiKey || !projectId) {
    console.error('\nMissing credentials. Set POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID.');
    console.error('See packages/analytics/posthog/README.md for setup.\n');
    process.exit(1);
  }

  for (const dashboard of CARDWISE_DASHBOARDS) {
    await syncDashboard(dashboard);
  }

  console.log('\nDone. Open PostHog → Dashboards to review CardWise — * dashboards.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
