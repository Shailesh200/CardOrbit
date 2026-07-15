import { Module } from '@nestjs/common';

import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { AiModule } from '../ai/ai.module';
import { JobsModule } from '../jobs/jobs.module';
import { RewardsModule } from '../rewards/rewards.module';
import { CatalogAiIngestService } from './catalog-ai-ingest.service';
import { CatalogImportController } from './catalog-import.controller';
import { CatalogImportService } from './catalog-import.service';

@Module({
  imports: [AdminAuthModule, RewardsModule, AiModule, JobsModule],
  controllers: [CatalogImportController],
  providers: [CatalogImportService, CatalogAiIngestService],
  exports: [CatalogImportService, CatalogAiIngestService],
})
export class CatalogImportModule {}
