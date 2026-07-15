#!/usr/bin/env bun
import { isAiConfigured } from '../config';
import { runAiEval } from './run-eval';

const live = process.argv.includes('--live');

async function main() {
  if (live && !isAiConfigured()) {
    console.error('AI not configured — set GEMINI_API_KEY for live eval.');
    process.exit(1);
  }

  console.log(`CardOrbit AI eval (${live ? 'live' : 'offline'})`);
  const report = await runAiEval({ live });

  for (const suite of report.suites) {
    const label = suite.cases[0]?.domain ?? 'suite';
    console.log(`\n[${label}] ${suite.total - suite.failed}/${suite.total} passed`);
    for (const row of suite.cases) {
      const status = row.passed ? '✓' : '✗';
      console.log(`  ${status} ${row.id}${row.mode === 'live' ? ' (live)' : ''}`);
      for (const issue of row.issues) {
        console.log(`      - ${issue}`);
      }
    }
  }

  if (!report.passed) {
    console.error('\n✗ AI eval failed');
    process.exit(1);
  }

  console.log('\n✓ AI eval passed');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
