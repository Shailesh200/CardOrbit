import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { newUuidV7 } from '../../../infrastructure/prisma/uuid';
import {
  PrismaBankRepository,
  PrismaCardNetworkRepository,
  PrismaCreditCardRepository,
} from '../infrastructure/prisma-card-catalog.repository';

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)('card catalog repositories (M-006)', () => {
  const prisma = new PrismaService();
  const banks = new PrismaBankRepository(prisma);
  const networks = new PrismaCardNetworkRepository(prisma);
  const cards = new PrismaCreditCardRepository(prisma);

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates bank + network + card with UUID v7 ids', async () => {
    const id = newUuidV7();
    const bank = await banks.create({
      name: `Test Bank ${id}`,
      slug: `test-bank-${id}`,
    });
    expect(bank.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );

    const network = await networks.create({
      code: `NET_${id.replace(/-/g, '').slice(0, 12)}`,
      name: `Network ${id}`,
      slug: `network-${id}`,
    });

    const card = await cards.create({
      name: `Test Card ${id}`,
      slug: `test-card-${id}`,
      bankId: bank.id,
      networkId: network.id,
      annualFeeInr: '12500.00',
    });

    expect(card.bankId).toBe(bank.id);
    expect(card.networkId).toBe(network.id);
    expect(Number(card.annualFeeInr)).toBe(12500);
  });

  it('soft-deletes cards so listActive excludes them', async () => {
    const id = newUuidV7();
    const bank = await banks.create({
      name: `Soft Bank ${id}`,
      slug: `soft-bank-${id}`,
    });
    const network = await networks.create({
      code: `SOFT_${id.replace(/-/g, '').slice(0, 12)}`,
      name: `Soft Net ${id}`,
      slug: `soft-net-${id}`,
    });

    const card = await cards.create({
      name: `Soft Card ${id}`,
      slug: `soft-card-${id}`,
      bankId: bank.id,
      networkId: network.id,
    });

    await cards.softDelete(card.id);

    const active = await cards.findBySlug(`soft-card-${id}`);
    expect(active).toBeNull();

    const includingDeleted = await cards.findBySlug(`soft-card-${id}`, {
      includeDeleted: true,
    });
    expect(includingDeleted?.deletedAt).not.toBeNull();

    const listed = await cards.listActive();
    expect(listed.find((c) => c.slug === `soft-card-${id}`)).toBeUndefined();
  });
});

describe('uuid v7 helper', () => {
  it('generates UUID version 7', () => {
    const id = newUuidV7();
    expect(id.charAt(14)).toBe('7');
  });
});
