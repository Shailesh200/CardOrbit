#!/usr/bin/env bun
/**
 * M-036 — Scan all users for expiring rewards and deliver in-app alerts.
 *
 * Usage: bun run reward-expiry:scan
 */
import { NestFactory } from '@nestjs/core';

import { AppModule } from '../app.module';
import { RewardExpiryService } from '../modules/reward-expiry/reward-expiry.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const rewardExpiry = app.get(RewardExpiryService);
    const result = await rewardExpiry.scanAllUsers();
    console.log(
      `Reward expiry scan complete — ${result.usersScanned} user(s), ${result.alertsDelivered} alert(s) delivered.`,
    );
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
