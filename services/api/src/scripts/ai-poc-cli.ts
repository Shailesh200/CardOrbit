/**
 * CardWise AI POC — Gemini structured tasks demo.
 *
 * Usage:
 *   bun run ai:poc ping
 *   bun run ai:poc catalog [--url <issuer-page>]
 *   bun run ai:poc explain
 *   bun run ai:poc all
 */
import {
  explainRecommendation,
  findUngroundedAmounts,
  isAiConfigured,
  loadAiConfig,
  pingAi,
  structureCardBundleFromPage,
  verifyGeminiApiKey,
} from '@cardwise/ai';
import {
  crawlIdfcFirstCard,
  discoverIdfcFirstCardPaths,
  IDFC_FIRST_BANK_SLUG,
  IDFC_FIRST_CATALOG_URL,
} from '@cardwise/catalog-ingest';

const DEFAULT_CARD_URL = 'https://www.idfcfirst.bank.in/credit-card/millennia';

async function resolveCatalogUrl(requested?: string): Promise<string> {
  if (requested) return requested;

  const candidates = [
    DEFAULT_CARD_URL,
    ...(await discoverIdfcFirstCardPaths())
      .map((path) => `https://www.idfcfirst.bank.in${path}`)
      .filter(
        (url) =>
          url.includes('millennia') || url.includes('hello-cashback') || url.includes('/classic'),
      ),
  ];

  for (const url of candidates) {
    const head = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    if (head.ok) return url;
  }

  throw new Error(
    'No reachable IDFC card URL found for POC (tried millennia, hello-cashback, classic)',
  );
}

function parseArgs(argv: string[]): { command: string; url?: string } {
  const command = argv[0] ?? 'all';
  let url: string | undefined;
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === '--url' && argv[i + 1]) {
      url = argv[i + 1];
      i++;
    }
  }
  return { command, url };
}

function printHeader(title: string) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(title);
  console.log('─'.repeat(60));
}

async function runPing() {
  printHeader('1/3 Ping Gemini');
  const keyCheck = await verifyGeminiApiKey();
  console.log(`✓ API key valid (model: ${keyCheck.model})`);

  const result = await pingAi();
  console.log(`✓ LLM model: ${result.model}`);
  console.log(`✓ Latency: ${result.latencyMs}ms`);
  const snippet = result.text.trim().slice(0, 120);
  console.log(`✓ LLM response: ${snippet || '(empty — key check above is sufficient)'}`);
  if (snippet && !/\bREADY\b/i.test(snippet)) {
    console.log('  (Note: model may chat instead of one-word replies — OK for POC)');
  }
}

async function runCatalog(url: string) {
  printHeader('2/3 AI catalog structuring (AI-native ingest POC)');

  const path = new URL(url).pathname;
  console.log(`Fetching ${url}…`);
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; CardWiseAiPoc/1.0)',
      Accept: 'text/html',
    },
    redirect: 'follow',
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  const html = await response.text();
  console.log(`Downloaded ${(html.length / 1024).toFixed(1)} KB HTML`);

  if (path.startsWith('/credit-card/') && url.includes('idfcfirst.bank.in')) {
    console.log('\nRule-based fallback (existing crawler) for comparison…');
    try {
      const ruleBased = await crawlIdfcFirstCard(path);
      if (ruleBased?.bundle) {
        console.log(`  Rule-based name: ${ruleBased.bundle.name}`);
        console.log(`  Highlights: ${ruleBased.bundle.highlights.length}`);
        console.log(`  Fees: ${ruleBased.bundle.structuredFees.length}`);
      } else {
        console.log('  Rule-based parser returned no bundle');
      }
    } catch (error) {
      console.log(`  Rule-based parser skipped: ${error instanceof Error ? error.message : error}`);
    }
  }

  console.log('\nCalling AI structureCardBundleFromPage…');
  const aiResult = await structureCardBundleFromPage({
    bankSlug: IDFC_FIRST_BANK_SLUG,
    sourceUrl: url,
    bankSourceUrl: IDFC_FIRST_CATALOG_URL,
    html,
  });

  const bundle = aiResult.data;
  console.log(`\n✓ AI model: ${aiResult.model}`);
  console.log(`✓ Latency: ${aiResult.latencyMs}ms`);
  if (aiResult.usage?.totalTokens) {
    console.log(`✓ Tokens: ${aiResult.usage.totalTokens}`);
  }
  console.log(`\nStructured card:`);
  console.log(`  name: ${bundle.name}`);
  console.log(`  slug: ${bundle.slug}`);
  console.log(`  network: ${bundle.networkCode}`);
  console.log(`  tier: ${bundle.tier}`);
  console.log(`  tags: ${bundle.tags.join(', ') || '(none)'}`);
  console.log(`  highlights: ${bundle.highlights.length}`);
  console.log(`  benefits: ${bundle.benefits.length}`);
  console.log(`  structuredFees: ${bundle.structuredFees.length}`);
  console.log(`  rewardRules: ${bundle.rewardRules.length}`);

  if (bundle.highlights.length > 0) {
    console.log('\nSample highlights:');
    for (const h of bundle.highlights.slice(0, 3)) {
      console.log(`  • [${h.category}] ${h.title}`);
    }
  }

  if (bundle.structuredFees.length > 0) {
    console.log('\nFees:');
    for (const fee of bundle.structuredFees.slice(0, 4)) {
      console.log(`  • ${fee.label}: ${fee.value}`);
    }
  }
}

async function runExplain() {
  printHeader('3/3 AI recommendation explanation (grounded POC)');

  const mockAudit = {
    spendContext: { amount: 850, merchantSlug: 'swiggy', categorySlug: 'dining' },
    recommendedCard: {
      cardName: 'HDFC Millennia',
      cardSlug: 'hdfc-millennia',
      expectedRewardInr: 42.5,
      explanation: '5% cashback on dining (capped)',
    },
    alternativeNames: ['SBI Cashback', 'Axis Ace'],
    breakdown: {
      amountInr: 850,
      rewardRatePercent: 5,
      cappedRewardInr: 42.5,
      ruleKey: 'hdfc-millennia-dining-5pct',
    },
    audit: [
      {
        cardSlug: 'hdfc-millennia',
        expectedRewardInr: 42.5,
        ruleKey: 'hdfc-millennia-dining-5pct',
        excluded: false,
      },
      {
        cardSlug: 'sbi-cashback',
        expectedRewardInr: 17,
        excluded: false,
      },
    ],
  };

  const result = await explainRecommendation({
    spendContext: mockAudit.spendContext,
    recommendedCard: mockAudit.recommendedCard,
    alternativeNames: mockAudit.alternativeNames,
    breakdown: mockAudit.breakdown,
    audit: mockAudit.audit,
  });

  const auditJson = JSON.stringify(mockAudit.audit);
  const ungrounded = findUngroundedAmounts(result.data.explanation, auditJson);

  console.log(`✓ Model: ${result.model}`);
  console.log(`✓ Latency: ${result.latencyMs}ms`);
  console.log(`\nExplanation:\n${result.data.explanation}`);
  console.log(`\nShort: ${result.data.shortSummary}`);
  console.log('\nBullets:');
  for (const bullet of result.data.bulletReasons) {
    console.log(`  • ${bullet}`);
  }

  if (ungrounded.length > 0) {
    console.log(
      `\n⚠ Ungrounded ₹ amounts (would use template fallback in prod): ${ungrounded.join(', ')}`,
    );
  } else {
    console.log('\n✓ Grounding check passed — all ₹ amounts trace to audit JSON');
  }
}

async function main() {
  const { command, url } = parseArgs(process.argv.slice(2));

  if (!isAiConfigured()) {
    console.error('AI not configured. Add to .env.local:');
    console.error('  GEMINI_API_KEY=...');
    console.error('  GEMINI_MODEL=gemini-flash-latest');
    process.exit(1);
  }

  const config = loadAiConfig();
  console.log('CardWise AI POC');
  console.log(`Provider: ${config.provider}`);
  console.log(`Default model: ${config.defaultModel}`);
  console.log(`Fast model: ${config.fastModel}`);

  switch (command) {
    case 'ping':
      await runPing();
      break;
    case 'catalog': {
      const catalogUrl = await resolveCatalogUrl(url);
      await runCatalog(catalogUrl);
      break;
    }
    case 'explain':
      await runExplain();
      break;
    case 'all':
      await runPing();
      await runCatalog(await resolveCatalogUrl(url));
      await runExplain();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Usage: ai:poc [ping|catalog|explain|all] [--url <url>]');
      process.exit(1);
  }

  console.log('\n✓ POC complete — AI-native path verified.');
}

main().catch((error) => {
  console.error('\n✗ POC failed:', error instanceof Error ? error.message : error);
  if (error instanceof Error && error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});
