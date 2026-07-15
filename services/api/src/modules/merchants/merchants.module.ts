import { Module } from '@nestjs/common';

import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { AuthModule } from '../auth/auth.module';
import {
  CreateMccMappingCommand,
  CreateMerchantAliasCommand,
  CreateMerchantCommand,
  DeleteMerchantAliasCommand,
  UpdateMerchantCommand,
} from './application/commands/merchant.commands';
import { FindMerchantByAliasQuery } from './application/queries/find-by-alias.query';
import { FindMccMappingQuery } from './application/queries/find-mcc.query';
import { GetAdminMerchantQuery } from './application/queries/get-admin-merchant.query';
import { ListMerchantCategoriesQuery } from './application/queries/list-merchant-categories.query';
import { ListMerchantsQuery } from './application/queries/list-merchants.query';
import { MerchantCoverageQuery } from './application/queries/merchant-coverage.query';
import { AdminMerchantsController } from './controllers/admin-merchants.controller';
import { MerchantPreferencesController } from './controllers/merchant-preferences.controller';
import { MerchantsController } from './controllers/merchants.controller';
import { MerchantPreferencesService } from './merchant-preferences.service';
import { MerchantsService } from './merchants.service';
import {
  MCC_MAPPING_REPOSITORY,
  MERCHANT_ALIAS_REPOSITORY,
  MERCHANT_CATEGORY_REPOSITORY,
  MERCHANT_REPOSITORY,
} from './domain/repositories/merchant-catalog.repository';
import {
  PrismaMccMappingRepository,
  PrismaMerchantAliasRepository,
  PrismaMerchantCategoryRepository,
  PrismaMerchantRepository,
} from './infrastructure/prisma-merchant.repository';

@Module({
  imports: [AdminAuthModule, AuthModule],
  controllers: [AdminMerchantsController, MerchantPreferencesController, MerchantsController],
  providers: [
    MerchantsService,
    MerchantPreferencesService,
    { provide: MERCHANT_CATEGORY_REPOSITORY, useClass: PrismaMerchantCategoryRepository },
    { provide: MERCHANT_REPOSITORY, useClass: PrismaMerchantRepository },
    { provide: MERCHANT_ALIAS_REPOSITORY, useClass: PrismaMerchantAliasRepository },
    { provide: MCC_MAPPING_REPOSITORY, useClass: PrismaMccMappingRepository },
    PrismaMerchantCategoryRepository,
    PrismaMerchantRepository,
    PrismaMerchantAliasRepository,
    PrismaMccMappingRepository,
    ListMerchantsQuery,
    ListMerchantCategoriesQuery,
    MerchantCoverageQuery,
    GetAdminMerchantQuery,
    FindMerchantByAliasQuery,
    FindMccMappingQuery,
    CreateMerchantCommand,
    UpdateMerchantCommand,
    CreateMerchantAliasCommand,
    DeleteMerchantAliasCommand,
    CreateMccMappingCommand,
  ],
  exports: [
    MerchantsService,
    MerchantPreferencesService,
    MERCHANT_CATEGORY_REPOSITORY,
    MERCHANT_REPOSITORY,
    MERCHANT_ALIAS_REPOSITORY,
    MCC_MAPPING_REPOSITORY,
    FindMerchantByAliasQuery,
    FindMccMappingQuery,
    MerchantCoverageQuery,
  ],
})
export class MerchantsModule {}
