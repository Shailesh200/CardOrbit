import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  CatalogGoldenDatasetSchema,
  RecoGoldenDatasetSchema,
  type CatalogGoldenDataset,
  type RecoGoldenDataset,
} from './schemas';
import { validateCatalogBundleSafety, validateRecoExplanationSafety } from './safety';

const FIXTURES_DIR = join(import.meta.dirname, 'fixtures');

export type EvalCaseResult = {
  id: string;
  domain: string;
  passed: boolean;
  issues: string[];
  mode: 'offline' | 'live';
};

export type EvalSuiteResult = {
  passed: boolean;
  total: number;
  failed: number;
  cases: EvalCaseResult[];
};

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

export function loadCatalogGoldenDataset(): CatalogGoldenDataset {
  const dataset = CatalogGoldenDatasetSchema.parse(
    readJson(join(FIXTURES_DIR, 'catalog', 'idfc-golden.json')),
  );
  return dataset;
}

export function loadRecoGoldenDataset(domain: 'dining' | 'travel'): RecoGoldenDataset {
  const dataset = RecoGoldenDatasetSchema.parse(
    readJson(join(FIXTURES_DIR, 'reco', `${domain}-golden.json`)),
  );
  if (dataset.domain !== domain) {
    throw new Error(`Expected ${domain} golden dataset, got ${dataset.domain}`);
  }
  return dataset;
}

export function runCatalogGoldenEval(): EvalSuiteResult {
  const dataset = loadCatalogGoldenDataset();
  const cases: EvalCaseResult[] = [];

  for (const entry of dataset.cards) {
    const issues = validateCatalogBundleSafety(entry.bundle);

    if (entry.bundle.highlights.length < entry.expect.minHighlights) {
      issues.push(`expected at least ${entry.expect.minHighlights} highlights`);
    }
    if (entry.bundle.structuredFees.length < entry.expect.minStructuredFees) {
      issues.push(`expected at least ${entry.expect.minStructuredFees} structured fees`);
    }
    if (entry.bundle.rewardRules.length < entry.expect.minRewardRules) {
      issues.push(`expected at least ${entry.expect.minRewardRules} reward rules`);
    }
    for (const tag of entry.expect.requiredTags) {
      if (!entry.bundle.tags.includes(tag)) {
        issues.push(`missing required tag "${tag}"`);
      }
    }

    cases.push({
      id: entry.id,
      domain: 'catalog',
      passed: issues.length === 0,
      issues,
      mode: 'offline',
    });
  }

  const htmlManifest = readJson(join(FIXTURES_DIR, 'catalog', 'html-manifest.json')) as {
    sources: Array<{ slug: string; kind: string; fixture: string }>;
  };
  const expectedSlugs = new Set([
    'hdfc',
    'icici',
    'sbi',
    'axis',
    'kotak',
    'yes-bank',
    'indusind',
    'idfc-first',
    'bob',
    'pnb',
    'standard-chartered',
    'citi',
    'rbl',
    'au',
    'hsbc',
    'cardinsider',
    'paisabazaar',
  ]);
  const manifestSlugs = new Set(htmlManifest.sources.map((row) => row.slug));
  const missing = [...expectedSlugs].filter((slug) => !manifestSlugs.has(slug));
  const htmlIssues: string[] = [];
  if (missing.length > 0) {
    htmlIssues.push(`html-manifest missing sources: ${missing.join(', ')}`);
  }
  for (const row of htmlManifest.sources) {
    try {
      readFileSync(join(FIXTURES_DIR, 'catalog', 'html', row.fixture), 'utf8');
    } catch {
      htmlIssues.push(`missing HTML fixture file: ${row.fixture} (for ${row.slug})`);
    }
  }
  cases.push({
    id: 'catalog-html-manifest-coverage',
    domain: 'catalog',
    passed: htmlIssues.length === 0,
    issues: htmlIssues,
    mode: 'offline',
  });

  const failed = cases.filter((row) => !row.passed).length;
  return { passed: failed === 0, total: cases.length, failed, cases };
}

export function runRecoGoldenEval(domain: 'dining' | 'travel'): EvalSuiteResult {
  const dataset = loadRecoGoldenDataset(domain);
  const cases: EvalCaseResult[] = [];

  for (const scenario of dataset.scenarios) {
    const auditJson = JSON.stringify(scenario.input.audit);
    const cardName = String(scenario.input.recommendedCard.cardName ?? 'Recommended card');
    const issues = validateRecoExplanationSafety({
      explanation: scenario.referenceExplanation,
      auditJson,
      recommendedCardName: cardName,
      mentionsCard: scenario.expect.mentionsCard,
      allowedPercents: scenario.expect.allowedPercents,
      allowedMultipliers: scenario.expect.allowedMultipliers,
    });

    cases.push({
      id: scenario.id,
      domain,
      passed: issues.length === 0,
      issues,
      mode: 'offline',
    });
  }

  const failed = cases.filter((row) => !row.passed).length;
  return { passed: failed === 0, total: cases.length, failed, cases };
}

export async function runRecoGoldenLiveEval(domain: 'dining' | 'travel'): Promise<EvalSuiteResult> {
  const { explainRecommendation } = await import('../tasks/reco-explain');
  const dataset = loadRecoGoldenDataset(domain);
  const cases: EvalCaseResult[] = [];

  for (const scenario of dataset.scenarios) {
    const auditJson = JSON.stringify(scenario.input.audit);
    const cardName = String(scenario.input.recommendedCard.cardName ?? 'Recommended card');
    let issues: string[] = [];

    try {
      const result = await explainRecommendation(scenario.input);
      issues = validateRecoExplanationSafety({
        explanation: result.data,
        auditJson,
        recommendedCardName: cardName,
        mentionsCard: scenario.expect.mentionsCard,
        allowedPercents: scenario.expect.allowedPercents,
        allowedMultipliers: scenario.expect.allowedMultipliers,
      });
    } catch (error) {
      issues = [error instanceof Error ? error.message : 'live reco explain failed'];
    }

    cases.push({
      id: scenario.id,
      domain,
      passed: issues.length === 0,
      issues,
      mode: 'live',
    });
  }

  const failed = cases.filter((row) => !row.passed).length;
  return { passed: failed === 0, total: cases.length, failed, cases };
}

export async function runAiEval(options: { live?: boolean } = {}): Promise<{
  passed: boolean;
  suites: EvalSuiteResult[];
}> {
  const suites: EvalSuiteResult[] = [runCatalogGoldenEval()];

  if (options.live) {
    suites.push(await runRecoGoldenLiveEval('dining'));
    suites.push(await runRecoGoldenLiveEval('travel'));
  } else {
    suites.push(runRecoGoldenEval('dining'));
    suites.push(runRecoGoldenEval('travel'));
  }

  const passed = suites.every((suite) => suite.passed);
  return { passed, suites };
}
