#!/usr/bin/env bun
/**
 * M-051 — Scan active users and deliver contextual in-app notifications.
 *
 * Usage: bun run notifications:sync
 */
import { NestFactory } from '@nestjs/core';

import { AppModule } from '../app.module';
import { ContextualNotificationsService } from '../modules/notifications/contextual-notifications.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const contextual = app.get(ContextualNotificationsService);
    const result = await contextual.scanAllUsers();
    console.log(
      `Contextual notifications scan complete — ${result.usersScanned} user(s), ${result.alertsDelivered} alert(s) delivered.`,
    );
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
