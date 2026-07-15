import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { hash as bcryptHash } from 'bcryptjs';

import {
  clearMemoryEvents,
  getMemoryEvents,
  initAnalytics,
  shutdownAnalytics,
} from '@cardwise/analytics';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { MerchantsService } from '../merchants.service';

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)('merchant directory consumer API (M-016)', () => {
  const prisma = new PrismaService();
  const merchants = new MerchantsService(prisma);

  beforeAll(async () => {
    await prisma.$connect();
    initAnalytics({ useMemory: true });
  });

  afterAll(async () => {
    await shutdownAnalytics();
    await prisma.$disconnect();
  });

  async function createUser(email: string) {
    return prisma.user.create({
      data: {
        email,
        passwordHash: await bcryptHash('Str0ng!Passw0rd', 10),
        emailVerifiedAt: new Date(),
        fullName: 'Merchant User',
        role: 'USER',
      },
    });
  }

  it('searches seeded merchants with pagination and emits MERCHANT_SEARCHED', async () => {
    clearMemoryEvents();
    const user = await createUser(`m016-merchant-${Date.now()}@cardwise.test`);

    const page = await merchants.searchMerchants(user.id, { q: 'Amazon', limit: 10 });
    expect(page.total).toBeGreaterThan(0);
    expect(page.items.some((item) => item.slug === 'amazon')).toBe(true);
    expect(page.hasMore).toBe(page.nextOffset !== null);

    const events = getMemoryEvents().filter((event) => event.event === 'MERCHANT_SEARCHED');
    expect(events).toHaveLength(1);
    expect(events[0]?.properties).toMatchObject({ query: 'Amazon', resultCount: page.total });
  });

  it('tracks failed searches with resultCount zero', async () => {
    clearMemoryEvents();
    const user = await createUser(`m016-failed-${Date.now()}@cardwise.test`);

    const page = await merchants.searchMerchants(user.id, {
      q: `nonexistent-merchant-${Date.now()}`,
      limit: 10,
    });
    expect(page.total).toBe(0);
    expect(page.items).toHaveLength(0);

    const events = getMemoryEvents().filter((event) => event.event === 'MERCHANT_SEARCHED');
    expect(events).toHaveLength(1);
    expect(events[0]?.properties).toMatchObject({ resultCount: 0 });
  });

  it('lists categories, popular merchants, and merchant detail', async () => {
    const user = await createUser(`m016-detail-${Date.now()}@cardwise.test`);

    const categories = await merchants.listCategories(user.id);
    expect(categories.length).toBeGreaterThan(0);
    expect(categories.length).toBeLessThanOrEqual(10);
    expect(categories.every((category) => !category.slug.includes('019f'))).toBe(true);
    expect(categories.some((category) => category.slug === 'shopping')).toBe(true);

    const popular = await merchants.listPopular(user.id);
    expect(popular.length).toBeGreaterThan(0);
    expect(popular[0]?.slug).toBe('amazon');

    const detail = await merchants.getMerchantBySlug(user.id, 'swiggy');
    expect(detail.name.toLowerCase()).toContain('swiggy');
    expect(detail.category?.slug).toBeTruthy();
    expect(detail.aliases.length).toBeGreaterThan(0);
    expect(detail.isFavorite).toBe(false);
  });

  it('filters search by category slug', async () => {
    const user = await createUser(`m016-category-${Date.now()}@cardwise.test`);

    const page = await merchants.searchMerchants(user.id, {
      categorySlug: 'dining',
      limit: 50,
    });
    expect(page.total).toBeGreaterThan(0);
    expect(page.items.every((item) => item.category?.slug === 'dining')).toBe(true);
  });
});
