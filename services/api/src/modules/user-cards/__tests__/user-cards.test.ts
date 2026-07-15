import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { hash as bcryptHash } from 'bcryptjs';

import {
  clearMemoryEvents,
  getMemoryEvents,
  initAnalytics,
  shutdownAnalytics,
} from '@cardwise/analytics';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { createPermissiveFeatureFlagsService } from '../../feature-flags/__tests__/feature-flags.test-helper';
import type { MailSyncService } from '../../mail-sync/mail-sync.service';
import { UserCardsService } from '../user-cards.service';

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)('user portfolio (M-015)', () => {
  const prisma = new PrismaService();
  const mailSync = {
    enqueueSyncAfterCardAdd: async () => undefined,
  } as unknown as MailSyncService;
  const portfolio = new UserCardsService(prisma, createPermissiveFeatureFlagsService(), mailSync);

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
        fullName: 'Portfolio User',
        role: 'USER',
      },
    });
  }

  it('lists catalog and adds, updates, removes portfolio cards', async () => {
    clearMemoryEvents();
    const user = await createUser(`m015-portfolio-${Date.now()}@cardwise.test`);

    const catalog = await portfolio.listCatalog(user.id, { limit: 50 });
    expect(catalog.items.length).toBeGreaterThan(0);
    const creditCardId = catalog.items[0]!.id;

    const added = await portfolio.addCard(user.id, { creditCardId });
    expect(added.creditCardId).toBe(creditCardId);
    expect(getMemoryEvents().some((e) => e.event === 'CARD_ADDED')).toBe(true);

    await expect(portfolio.addCard(user.id, { creditCardId })).rejects.toThrow(
      /already in your portfolio/i,
    );

    const list = await portfolio.listPortfolio(user.id);
    expect(list).toHaveLength(1);
    expect(list[0]?.isFavorite).toBe(false);

    const favorited = await portfolio.patchCard(user.id, added.id, { isFavorite: true });
    expect(favorited.isFavorite).toBe(true);

    const inactive = await portfolio.patchCard(user.id, added.id, { status: 'INACTIVE' });
    expect(inactive.status).toBe('INACTIVE');

    const detail = await portfolio.getPortfolioCard(user.id, added.id);
    expect(detail.card.name.length).toBeGreaterThan(0);

    clearMemoryEvents();
    await portfolio.removeCard(user.id, added.id);
    expect(getMemoryEvents().some((e) => e.event === 'CARD_REMOVED')).toBe(true);

    const afterRemove = await portfolio.listPortfolio(user.id);
    expect(afterRemove).toHaveLength(0);

    const readded = await portfolio.addCard(user.id, { creditCardId });
    expect(readded.creditCardId).toBe(creditCardId);
  });
});
