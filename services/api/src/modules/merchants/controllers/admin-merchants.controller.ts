import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { AdminAuditService } from '../../admin-auth/admin-audit.service';
import type { AdminPrincipal } from '../../admin-auth/admin-auth.types';
import { AdminJwtGuard } from '../../admin-auth/admin-jwt.guard';
import {
  CreateMccMappingCommand,
  CreateMerchantAliasCommand,
  CreateMerchantCommand,
  DeleteMerchantAliasCommand,
  UpdateMerchantCommand,
} from '../application/commands/merchant.commands';
import { ListMerchantCategoriesQuery } from '../application/queries/list-merchant-categories.query';
import { ListMerchantsQuery } from '../application/queries/list-merchants.query';
import { MerchantCoverageQuery } from '../application/queries/merchant-coverage.query';
import { GetAdminMerchantQuery } from '../application/queries/get-admin-merchant.query';

type RequestWithAdmin = { adminUser?: AdminPrincipal };

class CreateMerchantDto {
  name!: string;
  slug!: string;
  primaryCategoryId?: string | null;
  paymentMethods?: unknown;
  active?: boolean;
}

class UpdateMerchantDto {
  name?: string;
  slug?: string;
  primaryCategoryId?: string | null;
  paymentMethods?: unknown;
  active?: boolean;
}

class CreateAliasDto {
  alias!: string;
  normalizedAlias?: string;
}

class CreateMccDto {
  mccCode!: string;
  categoryId!: string;
  merchantId?: string | null;
  description?: string | null;
}

@ApiTags('admin-merchants')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin')
export class AdminMerchantsController {
  constructor(
    private readonly listMerchants: ListMerchantsQuery,
    private readonly listCategories: ListMerchantCategoriesQuery,
    private readonly merchantCoverage: MerchantCoverageQuery,
    private readonly getAdminMerchant: GetAdminMerchantQuery,
    private readonly createMerchant: CreateMerchantCommand,
    private readonly updateMerchant: UpdateMerchantCommand,
    private readonly createAlias: CreateMerchantAliasCommand,
    private readonly deleteAlias: DeleteMerchantAliasCommand,
    private readonly createMcc: CreateMccMappingCommand,
    private readonly audit: AdminAuditService,
  ) {}

  @Get('merchants')
  @ApiOkResponse({ description: 'Active merchants' })
  merchants() {
    return this.listMerchants.execute();
  }

  @Get('merchant-categories')
  @ApiOkResponse({ description: 'Active merchant categories' })
  merchantCategories() {
    return this.listCategories.execute();
  }

  @Get('merchants/coverage')
  @ApiOkResponse({ description: 'Merchant catalog coverage metrics (M-025)' })
  coverage() {
    return this.merchantCoverage.execute();
  }

  @Get('merchants/:id')
  @ApiOkResponse({ description: 'Merchant detail with aliases and MCC mappings' })
  merchantDetail(@Param('id') id: string) {
    return this.getAdminMerchant.execute(id);
  }

  @Post('merchants')
  @ApiOkResponse({ description: 'Create merchant' })
  async create(@Body() body: CreateMerchantDto, @Req() request: RequestWithAdmin) {
    const merchant = await this.createMerchant.execute(body);
    await this.audit.record(request.adminUser!, 'merchant.create', 'merchant', merchant.id, {
      slug: merchant.slug,
    });
    return merchant;
  }

  @Patch('merchants/:id')
  @ApiOkResponse({ description: 'Update merchant' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateMerchantDto,
    @Req() request: RequestWithAdmin,
  ) {
    const merchant = await this.updateMerchant.execute(id, body);
    await this.audit.record(request.adminUser!, 'merchant.update', 'merchant', merchant.id, body);
    return merchant;
  }

  @Post('merchants/:id/aliases')
  @ApiOkResponse({ description: 'Add merchant alias' })
  async addAlias(
    @Param('id') merchantId: string,
    @Body() body: CreateAliasDto,
    @Req() request: RequestWithAdmin,
  ) {
    const alias = await this.createAlias.execute({
      merchantId,
      alias: body.alias,
      normalizedAlias: body.normalizedAlias,
    });
    await this.audit.record(
      request.adminUser!,
      'merchant_alias.create',
      'merchant_alias',
      alias.id,
      {
        merchantId,
        alias: alias.alias,
      },
    );
    return alias;
  }

  @Delete('merchants/aliases/:aliasId')
  @ApiOkResponse({ description: 'Soft-delete merchant alias' })
  async removeAlias(@Param('aliasId') aliasId: string, @Req() request: RequestWithAdmin) {
    const result = await this.deleteAlias.execute(aliasId);
    await this.audit.record(request.adminUser!, 'merchant_alias.delete', 'merchant_alias', aliasId);
    return result;
  }

  @Post('mcc-mappings')
  @ApiOkResponse({ description: 'Create MCC mapping' })
  async createMccMapping(@Body() body: CreateMccDto, @Req() request: RequestWithAdmin) {
    const mapping = await this.createMcc.execute(body);
    await this.audit.record(request.adminUser!, 'mcc_mapping.create', 'mcc_mapping', mapping.id, {
      mccCode: mapping.mccCode,
    });
    return mapping;
  }
}
