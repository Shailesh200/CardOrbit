import {
  Body,
  Controller,
  Get,
  BadRequestException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { AdminAuditService } from '../../admin-auth/admin-audit.service';
import type { AdminPrincipal } from '../../admin-auth/admin-auth.types';
import { AdminJwtGuard } from '../../admin-auth/admin-jwt.guard';
import { AssetStorageService } from '../asset-storage.service';
import { AssetsService } from '../assets.service';

type MultipartFile = {
  file: NodeJS.ReadableStream;
  filename: string;
  mimetype: string;
  fields?: Record<string, unknown>;
};

type RequestWithAdmin = {
  adminUser?: AdminPrincipal;
  file: () => Promise<MultipartFile | undefined>;
};

function readMultipartField(
  fields: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const value = fields?.[key];
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'value' in value) {
    const inner = (value as { value?: unknown }).value;
    return typeof inner === 'string' ? inner : undefined;
  }
  return undefined;
}

@ApiTags('admin-assets')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/assets')
export class AdminAssetsController {
  constructor(
    private readonly assets: AssetsService,
    private readonly storage: AssetStorageService,
    private readonly audit: AdminAuditService,
  ) {}

  @Get()
  @ApiOkResponse({ description: 'Paginated catalog entities with brand asset URLs' })
  list(@Query() query: unknown) {
    return this.assets.listAdminAssetsPaginated(query);
  }

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ description: 'Upload image file and receive a public URL' })
  async upload(@Req() request: RequestWithAdmin) {
    const file = await request.file();
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const entityTypeRaw = readMultipartField(file.fields, 'entityType');
    if (!entityTypeRaw) {
      throw new BadRequestException('entityType is required');
    }

    const folder = this.storage.resolveEntityFolder(entityTypeRaw);
    const slug = readMultipartField(file.fields, 'slug');

    const saved = await this.storage.saveUpload({
      entityType: folder,
      slug,
      filename: file.filename,
      mimetype: file.mimetype,
      stream: file.file,
    });

    await this.audit.record(request.adminUser!, 'asset.upload', folder, saved.path, {
      url: saved.url,
    });

    return saved;
  }

  @Post('banks')
  @ApiOkResponse({ description: 'Create bank' })
  async createBank(@Body() body: unknown, @Req() request: RequestWithAdmin) {
    const row = await this.assets.createBank(body);
    await this.audit.record(request.adminUser!, 'bank.create', 'bank', row.id, { slug: row.slug });
    return row;
  }

  @Patch('banks/:id')
  @ApiOkResponse({ description: 'Update bank' })
  async updateBank(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: RequestWithAdmin,
  ) {
    const row = await this.assets.updateBank(id, body);
    await this.audit.record(request.adminUser!, 'bank.update', 'bank', id, body);
    return row;
  }

  @Post('banks/:id/archive')
  @ApiOkResponse({ description: 'Archive bank' })
  async archiveBank(@Param('id') id: string, @Req() request: RequestWithAdmin) {
    const result = await this.assets.archiveBank(id);
    await this.audit.record(request.adminUser!, 'bank.archive', 'bank', id);
    return result;
  }

  @Post('merchants')
  @ApiOkResponse({ description: 'Create merchant' })
  async createMerchant(@Body() body: unknown, @Req() request: RequestWithAdmin) {
    const row = await this.assets.createMerchant(body);
    await this.audit.record(request.adminUser!, 'merchant.create', 'merchant', row.id, {
      slug: row.slug,
    });
    return row;
  }

  @Patch('merchants/:id')
  @ApiOkResponse({ description: 'Update merchant' })
  async updateMerchant(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: RequestWithAdmin,
  ) {
    const row = await this.assets.updateMerchant(id, body);
    await this.audit.record(request.adminUser!, 'merchant.update', 'merchant', id, body);
    return row;
  }

  @Post('merchants/:id/archive')
  @ApiOkResponse({ description: 'Archive merchant' })
  async archiveMerchant(@Param('id') id: string, @Req() request: RequestWithAdmin) {
    const result = await this.assets.archiveMerchant(id);
    await this.audit.record(request.adminUser!, 'merchant.archive', 'merchant', id);
    return result;
  }

  @Post('credit-cards')
  @ApiOkResponse({ description: 'Create credit card' })
  async createCreditCard(@Body() body: unknown, @Req() request: RequestWithAdmin) {
    const row = await this.assets.createCreditCard(body);
    await this.audit.record(request.adminUser!, 'credit_card.create', 'credit_card', row.id, {
      slug: row.slug,
    });
    return row;
  }

  @Patch('credit-cards/:id')
  @ApiOkResponse({ description: 'Update credit card' })
  async updateCreditCard(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: RequestWithAdmin,
  ) {
    const row = await this.assets.updateCreditCard(id, body);
    await this.audit.record(request.adminUser!, 'credit_card.update', 'credit_card', id, body);
    return row;
  }

  @Post('credit-cards/:id/archive')
  @ApiOkResponse({ description: 'Archive credit card' })
  async archiveCreditCard(@Param('id') id: string, @Req() request: RequestWithAdmin) {
    const result = await this.assets.archiveCreditCard(id);
    await this.audit.record(request.adminUser!, 'credit_card.archive', 'credit_card', id);
    return result;
  }
}
