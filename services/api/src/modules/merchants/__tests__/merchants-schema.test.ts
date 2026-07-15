import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { newUuidV7 } from '../../../infrastructure/prisma/uuid';
import {
  PrismaMccMappingRepository,
  PrismaMerchantAliasRepository,
  PrismaMerchantCategoryRepository,
  PrismaMerchantRepository,
} from '../infrastructure/prisma-merchant.repository';

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)('merchant catalog repositories (M-007)', () => {
  const prisma = new PrismaService();
  const categories = new PrismaMerchantCategoryRepository(prisma);
  const merchants = new PrismaMerchantRepository(prisma);
  const aliases = new PrismaMerchantAliasRepository(prisma);
  const mccMappings = new PrismaMccMappingRepository(prisma);
  const createdCategoryIds: string[] = [];
  const createdMerchantIds: string[] = [];
  const createdMccIds: string[] = [];

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterEach(async () => {
    if (createdMccIds.length > 0) {
      await prisma.mccMapping.updateMany({
        where: { id: { in: createdMccIds } },
        data: { deletedAt: new Date(), version: { increment: 1 } },
      });
      createdMccIds.length = 0;
    }
    for (const merchantId of createdMerchantIds) {
      await merchants.softDelete(merchantId);
    }
    createdMerchantIds.length = 0;
    if (createdCategoryIds.length > 0) {
      await prisma.merchantCategory.updateMany({
        where: { id: { in: createdCategoryIds } },
        data: { deletedAt: new Date(), version: { increment: 1 } },
      });
      createdCategoryIds.length = 0;
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates merchant + alias and finds by alias', async () => {
    const id = newUuidV7();
    const category = await categories.create({
      code: `DIN_${id.replace(/-/g, '')}`,
      name: `Dining ${id}`,
      slug: `dining-${id}`,
    });
    createdCategoryIds.push(category.id);

    const merchant = await merchants.create({
      name: `Swiggy Test ${id}`,
      slug: `swiggy-${id}`,
      primaryCategoryId: category.id,
    });
    createdMerchantIds.push(merchant.id);
    expect(merchant.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );

    await aliases.create({
      merchantId: merchant.id,
      alias: `Swiggy Foods ${id}`,
    });

    const hit = await aliases.findByAlias(`  swiggy foods ${id}  `);
    expect(hit?.merchantId).toBe(merchant.id);
  });

  it('maps MCC by code (global and merchant override)', async () => {
    const id = newUuidV7();
    const category = await categories.create({
      code: `SHP_${id.replace(/-/g, '')}`,
      name: `Shopping ${id}`,
      slug: `shopping-${id}`,
    });
    const overrideCategory = await categories.create({
      code: `TRV_${id.replace(/-/g, '')}`,
      name: `Travel ${id}`,
      slug: `travel-${id}`,
    });
    createdCategoryIds.push(category.id, overrideCategory.id);
    const merchant = await merchants.create({
      name: `Amazon ${id}`,
      slug: `amazon-${id}`,
      primaryCategoryId: category.id,
    });
    createdMerchantIds.push(merchant.id);

    const mccCode = `5${id.replace(/-/g, '').slice(0, 11)}`;
    const global = await mccMappings.create({
      mccCode,
      categoryId: category.id,
      description: 'Global shopping MCC',
    });
    createdMccIds.push(global.id);
    expect(global.merchantId).toBeNull();

    const foundGlobal = await mccMappings.findByMccCode(mccCode);
    expect(foundGlobal?.categoryId).toBe(category.id);

    const override = await mccMappings.create({
      mccCode,
      categoryId: overrideCategory.id,
      merchantId: merchant.id,
      description: 'Merchant override',
    });
    createdMccIds.push(override.id);

    const foundOverride = await mccMappings.findByMccCode(mccCode, {
      merchantId: merchant.id,
    });
    expect(foundOverride?.categoryId).toBe(overrideCategory.id);
  });

  it('soft-deletes merchants so listActive excludes them', async () => {
    const id = newUuidV7();
    const merchant = await merchants.create({
      name: `Soft Merchant ${id}`,
      slug: `soft-merchant-${id}`,
    });
    createdMerchantIds.push(merchant.id);

    await merchants.softDelete(merchant.id);

    const active = await merchants.findBySlug(`soft-merchant-${id}`);
    expect(active).toBeNull();

    const includingDeleted = await merchants.findBySlug(`soft-merchant-${id}`, {
      includeDeleted: true,
    });
    expect(includingDeleted?.deletedAt).not.toBeNull();

    const listed = await merchants.listActive();
    expect(listed.find((m) => m.slug === `soft-merchant-${id}`)).toBeUndefined();
  });

  it('searches merchants by name fragment via FTS', async () => {
    const id = newUuidV7();
    const uniqueToken = `zeptofind${id.replace(/-/g, '').slice(0, 10)}`;
    const merchant = await merchants.create({
      name: `${uniqueToken} Grocery Hub`,
      slug: `zepto-${id}`,
    });
    createdMerchantIds.push(merchant.id);

    const results = await merchants.searchByName(uniqueToken);
    expect(results.some((m) => m.slug === `zepto-${id}`)).toBe(true);
  });
});
