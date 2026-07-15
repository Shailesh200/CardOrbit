import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { newUuidV7 } from '../../../infrastructure/prisma/uuid';
import {
  PrismaBankRepository,
  PrismaCardNetworkRepository,
  PrismaCreditCardRepository,
} from '../../cards/infrastructure/prisma-card-catalog.repository';
import { PrismaMerchantRepository } from '../../merchants/infrastructure/prisma-merchant.repository';
import { PrismaOfferRepository } from '../infrastructure/prisma-offer.repository';

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)('offer catalog repositories (M-009)', () => {
  const prisma = new PrismaService();
  const banks = new PrismaBankRepository(prisma);
  const networks = new PrismaCardNetworkRepository(prisma);
  const cards = new PrismaCreditCardRepository(prisma);
  const merchants = new PrismaMerchantRepository(prisma);
  const offers = new PrismaOfferRepository(prisma);

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function createCardAndMerchant() {
    const id = newUuidV7();
    const bank = await banks.create({
      name: `Offer Bank ${id}`,
      slug: `offer-bank-${id}`,
    });
    const network = await networks.create({
      code: `OFF_${id.replace(/-/g, '').slice(0, 12)}`,
      name: `Offer Net ${id}`,
      slug: `offer-net-${id}`,
    });
    const card = await cards.create({
      name: `Offer Card ${id}`,
      slug: `offer-card-${id}`,
      bankId: bank.id,
      networkId: network.id,
    });
    const merchant = await merchants.create({
      name: `Offer Merchant ${id}`,
      slug: `offer-merchant-${id}`,
    });
    return { id, bank, card, merchant };
  }

  it('creates offer with card and merchant assignments', async () => {
    const { id, bank, card, merchant } = await createCardAndMerchant();
    const now = new Date('2026-06-01T00:00:00.000Z');

    const offer = await offers.create({
      code: `amazon_hdfc_${id.replace(/-/g, '')}`,
      slug: `amazon-hdfc-${id}`,
      title: `Amazon HDFC ${id}`,
      type: 'MERCHANT',
      issuerBankId: bank.id,
      cashbackPercent: '5.0000',
      capInr: '1000.00',
      validFrom: now,
      validUntil: new Date('2026-12-31T23:59:59.000Z'),
      status: 'ACTIVE',
    });

    expect(offer.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );

    const cardAssignment = await offers.assignCard({
      offerId: offer.id,
      creditCardId: card.id,
    });
    expect(cardAssignment.creditCardId).toBe(card.id);

    const merchantLink = await offers.assignMerchant({
      offerId: offer.id,
      merchantId: merchant.id,
    });
    expect(merchantLink.merchantId).toBe(merchant.id);
  });

  it('lists active offers by date window', async () => {
    const { id } = await createCardAndMerchant();

    const current = await offers.create({
      code: `current_${id.replace(/-/g, '')}`,
      slug: `current-${id}`,
      title: `Current Offer ${id}`,
      type: 'BANK',
      validFrom: new Date('2026-01-01T00:00:00.000Z'),
      validUntil: new Date('2026-12-31T00:00:00.000Z'),
      status: 'ACTIVE',
    });

    const future = await offers.create({
      code: `future_${id.replace(/-/g, '')}`,
      slug: `future-${id}`,
      title: `Future Offer ${id}`,
      type: 'CARD',
      validFrom: new Date('2027-01-01T00:00:00.000Z'),
      validUntil: new Date('2027-06-30T00:00:00.000Z'),
      status: 'SCHEDULED',
    });

    const past = await offers.create({
      code: `past_${id.replace(/-/g, '')}`,
      slug: `past-${id}`,
      title: `Past Offer ${id}`,
      type: 'MERCHANT',
      validFrom: new Date('2025-01-01T00:00:00.000Z'),
      validUntil: new Date('2025-06-30T00:00:00.000Z'),
      status: 'ACTIVE',
    });

    const asOf = new Date('2026-07-08T12:00:00.000Z');
    const active = await offers.listActiveAsOf(asOf);
    const codes = active.map((o) => o.code);

    expect(codes).toContain(current.code);
    expect(codes).not.toContain(future.code);
    expect(codes).not.toContain(past.code);
  });

  it('preserves historical offers after expiry', async () => {
    const { id } = await createCardAndMerchant();
    const offer = await offers.create({
      code: `expire_${id.replace(/-/g, '')}`,
      slug: `expire-${id}`,
      title: `Expiring Offer ${id}`,
      type: 'MERCHANT',
      validFrom: new Date('2026-01-01T00:00:00.000Z'),
      validUntil: new Date('2026-12-31T00:00:00.000Z'),
      status: 'ACTIVE',
    });

    const expired = await offers.expireOffer(offer.id);
    expect(expired.status).toBe('EXPIRED');
    expect(expired.deletedAt).toBeNull();

    const active = await offers.listActiveAsOf(new Date('2026-07-08T00:00:00.000Z'));
    expect(active.find((o) => o.code === offer.code)).toBeUndefined();

    const historical = await offers.markHistorical(offer.id);
    expect(historical.status).toBe('HISTORICAL');

    const found = await offers.findByCode(offer.code, { includeHistorical: true });
    expect(found?.id).toBe(offer.id);
    expect(found?.status).toBe('HISTORICAL');

    const withoutHistorical = await offers.findByCode(offer.code);
    expect(withoutHistorical).toBeNull();
  });
});
