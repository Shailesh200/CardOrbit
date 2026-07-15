import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { MerchantPreferencesService } from '../merchant-preferences.service';

describe('MerchantPreferencesService', () => {
  const prisma = {
    user: { findUnique: vi.fn() },
    merchant: { findFirst: vi.fn() },
    favoriteMerchant: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    savedSearch: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  } as unknown as PrismaService;

  const service = new MerchantPreferencesService(prisma);

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.user.findUnique = vi.fn().mockResolvedValue({ id: 'user-1', accountStatus: 'ACTIVE' });
  });

  it('lists favorite merchants for the signed-in user', async () => {
    prisma.favoriteMerchant.findMany = vi.fn().mockResolvedValue([
      {
        id: 'fav-1',
        merchantId: 'merchant-1',
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
        merchant: {
          id: 'merchant-1',
          name: 'Swiggy',
          slug: 'swiggy',
          deletedAt: null,
          active: true,
          primaryCategory: { id: 'cat-1', name: 'Dining', slug: 'dining' },
        },
      },
    ]);

    const rows = await service.listFavoriteMerchants('user-1');

    expect(rows).toHaveLength(1);
    expect(rows[0]?.merchant.slug).toBe('swiggy');
  });

  it('creates a saved search with query and category', async () => {
    prisma.savedSearch.count = vi.fn().mockResolvedValue(0);
    prisma.savedSearch.create = vi.fn().mockResolvedValue({
      id: 'saved-1',
      name: 'Food delivery',
      query: 'swiggy',
      categorySlug: 'dining',
      createdAt: new Date('2026-07-12T00:00:00.000Z'),
      updatedAt: new Date('2026-07-12T00:00:00.000Z'),
    });

    const saved = await service.createSavedSearch('user-1', {
      name: 'Food delivery',
      query: 'swiggy',
      categorySlug: 'dining',
    });

    expect(saved.name).toBe('Food delivery');
    expect(saved.categorySlug).toBe('dining');
  });

  it('rejects saved searches without query or category', async () => {
    prisma.savedSearch.count = vi.fn().mockResolvedValue(0);

    await expect(
      service.createSavedSearch('user-1', { name: 'Empty', query: '', categorySlug: null }),
    ).rejects.toThrow(/query or category/i);
  });

  it('adds favorite merchant idempotently', async () => {
    prisma.merchant.findFirst = vi.fn().mockResolvedValue({
      id: 'merchant-1',
      name: 'Amazon',
      slug: 'amazon',
      deletedAt: null,
      active: true,
      primaryCategory: null,
    });
    prisma.favoriteMerchant.findUnique = vi.fn().mockResolvedValue(null);
    prisma.favoriteMerchant.count = vi.fn().mockResolvedValue(0);
    prisma.favoriteMerchant.create = vi.fn().mockResolvedValue({
      id: 'fav-1',
      merchantId: 'merchant-1',
      createdAt: new Date('2026-07-12T00:00:00.000Z'),
      merchant: {
        id: 'merchant-1',
        name: 'Amazon',
        slug: 'amazon',
        primaryCategory: null,
      },
    });

    const favorite = await service.addFavoriteMerchant('user-1', { slug: 'amazon' });

    expect(favorite.merchant.slug).toBe('amazon');
    expect(prisma.favoriteMerchant.create).toHaveBeenCalled();
  });
});
