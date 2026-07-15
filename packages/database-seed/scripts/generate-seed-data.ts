/**
 * Reference catalog seed generator (M-010, M-025).
 * Run: bun scripts/generate-seed-data.ts (from packages/database-seed)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { MERCHANT_CATALOG, STANDARD_MCC_MAPPINGS } from './merchant-catalog';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'data');

mkdirSync(dataDir, { recursive: true });

const networks = [
  { code: 'VISA', name: 'Visa', slug: 'visa' },
  { code: 'MASTERCARD', name: 'Mastercard', slug: 'mastercard' },
  { code: 'RUPAY', name: 'RuPay', slug: 'rupay' },
  { code: 'AMEX', name: 'American Express', slug: 'amex' },
];

const bankDefs = [
  { name: 'HDFC Bank', slug: 'hdfc' },
  { name: 'ICICI Bank', slug: 'icici' },
  { name: 'State Bank of India', slug: 'sbi' },
  { name: 'Axis Bank', slug: 'axis' },
  { name: 'Kotak Mahindra Bank', slug: 'kotak' },
  { name: 'Yes Bank', slug: 'yes-bank' },
  { name: 'IndusInd Bank', slug: 'indusind' },
  { name: 'IDFC FIRST Bank', slug: 'idfc-first' },
  { name: 'Bank of Baroda', slug: 'bob' },
  { name: 'Punjab National Bank', slug: 'pnb' },
  { name: 'Standard Chartered', slug: 'standard-chartered' },
  { name: 'Citibank', slug: 'citi' },
  { name: 'RBL Bank', slug: 'rbl' },
  { name: 'AU Small Finance Bank', slug: 'au' },
  { name: 'HSBC', slug: 'hsbc' },
];

const banks = bankDefs.map((b) => ({ ...b, country: 'IN' as const }));

const spendCategories = [
  { code: 'TRAVEL', name: 'Travel', slug: 'travel' },
  { code: 'DINING', name: 'Dining', slug: 'dining' },
  { code: 'SHOPPING', name: 'Shopping', slug: 'shopping' },
  { code: 'FUEL', name: 'Fuel', slug: 'fuel' },
  { code: 'GROCERIES', name: 'Groceries', slug: 'groceries' },
  { code: 'ONLINE', name: 'Online', slug: 'online' },
  { code: 'UTILITIES', name: 'Utilities', slug: 'utilities' },
  { code: 'ENTERTAINMENT', name: 'Entertainment', slug: 'entertainment' },
];

const merchantCategories = [
  { code: 'SHOP', name: 'Shopping', slug: 'shopping' },
  { code: 'TRAVEL', name: 'Travel', slug: 'travel' },
  { code: 'DINING', name: 'Dining', slug: 'dining' },
  { code: 'GROCERY', name: 'Grocery', slug: 'grocery' },
  { code: 'FUEL', name: 'Fuel', slug: 'fuel' },
  { code: 'ENTERTAINMENT', name: 'Entertainment', slug: 'entertainment' },
  { code: 'UTILITIES', name: 'Utilities', slug: 'utilities' },
  { code: 'HEALTH', name: 'Health', slug: 'health' },
];

const rewardPrograms = banks.map((bank, i) => ({
  name: `${bank.name} Rewards`,
  slug: `${bank.slug}-rewards`,
  issuerBankSlug: bank.slug,
  pointValueInr: 0.25 + (i % 4) * 0.05,
}));

const merchants = MERCHANT_CATALOG.map((entry) => ({
  name: entry.name,
  slug: entry.slug,
  primaryCategoryCode: entry.primaryCategoryCode,
  aliases: [`${entry.name} India`, entry.slug.replace(/-/g, ' ')],
  paymentMethods: ['CARD'],
  active: true,
  website: entry.website ?? null,
  brandName: entry.brandName ?? entry.name,
  parentBrand: entry.parentBrand ?? null,
  popularityScore: entry.popularityScore ?? 30,
  tags: entry.tags ?? [],
}));

const mccMappings = STANDARD_MCC_MAPPINGS.map((row) => ({ ...row }));

const cards = [
  {
    name: 'HDFC Regalia Gold',
    slug: 'hdfc-regalia-gold',
    bankSlug: 'hdfc',
    networkCode: 'VISA',
    rewardProgramSlug: 'hdfc-rewards',
    tier: 'PREMIUM' as const,
    active: true,
    annualFeeInr: 2500,
  },
  {
    name: 'ICICI Amazon Pay',
    slug: 'icici-amazon-pay',
    bankSlug: 'icici',
    networkCode: 'VISA',
    rewardProgramSlug: 'icici-rewards',
    tier: 'STANDARD' as const,
    active: true,
    annualFeeInr: 0,
  },
  {
    name: 'Axis Flipkart',
    slug: 'axis-flipkart',
    bankSlug: 'axis',
    networkCode: 'MASTERCARD',
    rewardProgramSlug: 'axis-rewards',
    tier: 'STANDARD' as const,
    active: true,
    annualFeeInr: 500,
  },
];

const rewardRules = [
  {
    ruleKey: 'hdfc-regalia-dining-quarterly-cap',
    name: 'Regalia Gold — dining 5% (quarterly cap)',
    cardSlug: 'hdfc-regalia-gold',
    rewardProgramSlug: 'hdfc-rewards',
    spendCategoryCode: 'DINING',
    payload: {
      cashbackPercent: 5,
      capPeriod: 'quarterly',
      periodCapInr: 1500,
      exclusions: ['fuel', 'rent', 'wallet'],
    },
    validFrom: '2026-01-01',
    validUntil: '2026-12-31',
  },
  {
    ruleKey: 'icici-amazon-q2-campaign',
    name: 'Amazon Pay — Amazon Q2 2x boost',
    cardSlug: 'icici-amazon-pay',
    rewardProgramSlug: 'icici-rewards',
    merchantSlug: 'amazon',
    payload: {
      rewardMultiplier: 5,
      quarterlyCampaign: { multiplierBoost: 2, activeQuarters: [2] },
      capPeriod: 'monthly',
      periodCapInr: 2000,
      exclusions: ['fuel', 'rent'],
    },
    validFrom: '2026-01-01',
    validUntil: '2026-12-31',
  },
  {
    ruleKey: 'axis-flipkart-cumulative-milestone',
    name: 'Flipkart — cumulative ₹25k milestone',
    cardSlug: 'axis-flipkart',
    rewardProgramSlug: 'axis-rewards',
    merchantSlug: 'flipkart',
    payload: {
      cashbackPercent: 5,
      spendThreshold: 25000,
      milestoneBonus: 500,
      milestoneMode: 'cumulative',
      milestonePeriod: 'quarterly',
      exclusions: ['fuel'],
    },
    validFrom: '2026-01-01',
    validUntil: '2026-12-31',
  },
];

const banksFile = { networks, banks };
const cardsFile = { rewardPrograms, spendCategories, cards };
const merchantsFile = { categories: merchantCategories, merchants, mccMappings };
const rewardRulesFile = { rules: rewardRules };
const offersFile = { offers: [] as never[] };

function write(name: string, data: unknown) {
  const path = join(dataDir, name);
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  console.log(`wrote ${name}`);
}

write('banks.json', banksFile);
write('cards.json', cardsFile);
write('merchants.json', merchantsFile);
write('reward-rules.json', rewardRulesFile);
write('offers.json', offersFile);

console.log(
  JSON.stringify(
    {
      banks: banks.length,
      cards: cards.length,
      merchants: merchants.length,
      mccMappings: mccMappings.length,
      rules: rewardRules.length,
      offers: 0,
    },
    null,
    2,
  ),
);
