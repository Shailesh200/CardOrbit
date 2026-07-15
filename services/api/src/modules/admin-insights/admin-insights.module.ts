import { Module } from '@nestjs/common';

import { CatalogImportModule } from '../catalog-import/catalog-import.module';
import { MerchantsModule } from '../merchants/merchants.module';
import { AdminInsightsController } from './admin-insights.controller';
import { AdminInsightsService } from './admin-insights.service';

@Module({
  imports: [CatalogImportModule, MerchantsModule],
  controllers: [AdminInsightsController],
  providers: [AdminInsightsService],
  exports: [AdminInsightsService],
})
export class AdminInsightsModule {}
