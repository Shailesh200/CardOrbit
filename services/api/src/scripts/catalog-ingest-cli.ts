/**
 * Crawl IDFC FIRST Bank cards into admin review queue.
 * Run: bun run catalog:ingest (from services/api) or bun run --filter @cardwise/api catalog:ingest
 */
import { PrismaClient } from '@prisma/client';

import { CatalogImportService } from '../modules/catalog-import/catalog-import.service';
import { AdminAuditService } from '../modules/admin-auth/admin-audit.service';
import { ActivateRewardRuleVersionCommand } from '../modules/rewards/application/commands/activate-rule-version.command';
import { PrismaRewardRuleRepository } from '../modules/rewards/infrastructure/prisma-reward-rule.repository';
import { PrismaService } from '../infrastructure/prisma/prisma.service';

async function main() {
  const bankSlug = process.argv[2] ?? 'idfc-first';
  const prisma = new PrismaClient();
  const prismaService = prisma as unknown as PrismaService;
  const repo = new PrismaRewardRuleRepository(prismaService);
  const activate = new ActivateRewardRuleVersionCommand(repo);
  const audit = new AdminAuditService(prismaService);
  const service = new CatalogImportService(prismaService, audit, activate);

  console.log(`Crawling ${bankSlug}…`);
  const result = await service.crawlBankCatalogBatch(bankSlug);
  console.log(`✓ Staged batch ${result.batchId} (${result.itemCount} cards)`);
  console.log('  Review in Admin → Import Center → View details → Approve → Publish.');
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
