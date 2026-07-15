import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  parseSeedBanksFile,
  parseSeedCardsFile,
  parseSeedMerchantsFile,
  parseSeedOffersFile,
  parseSeedRewardRulesFile,
  type SeedBanksFile,
  type SeedCardsFile,
  type SeedMerchantsFile,
  type SeedOffersFile,
  type SeedRewardRulesFile,
} from '@cardwise/validation';

function resolveSeedDataDir(): string {
  const candidates = [
    join(process.cwd(), 'packages/database-seed/data'),
    join(process.cwd(), '../../packages/database-seed/data'),
    join(process.cwd(), '../database-seed/data'),
    join(process.cwd(), 'data'),
  ];
  for (const candidate of candidates) {
    if (existsSync(join(candidate, 'banks.json'))) {
      return candidate;
    }
  }
  throw new Error(
    'Could not locate packages/database-seed/data (run from repo root or services/api)',
  );
}

export const seedDataDir = resolveSeedDataDir();

export const seedFilePaths = {
  banks: join(seedDataDir, 'banks.json'),
  cards: join(seedDataDir, 'cards.json'),
  merchants: join(seedDataDir, 'merchants.json'),
  rewardRules: join(seedDataDir, 'reward-rules.json'),
  offers: join(seedDataDir, 'offers.json'),
} as const;

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function loadSeedBanks(): SeedBanksFile {
  return parseSeedBanksFile(readJson(seedFilePaths.banks));
}

export function loadSeedCards(): SeedCardsFile {
  return parseSeedCardsFile(readJson(seedFilePaths.cards));
}

export function loadSeedMerchants(): SeedMerchantsFile {
  return parseSeedMerchantsFile(readJson(seedFilePaths.merchants));
}

export function loadSeedRewardRules(): SeedRewardRulesFile {
  return parseSeedRewardRulesFile(readJson(seedFilePaths.rewardRules));
}

export function loadSeedOffers(): SeedOffersFile {
  return parseSeedOffersFile(readJson(seedFilePaths.offers));
}

export function loadAllSeedFiles() {
  return {
    banks: loadSeedBanks(),
    cards: loadSeedCards(),
    merchants: loadSeedMerchants(),
    rewardRules: loadSeedRewardRules(),
    offers: loadSeedOffers(),
  };
}
