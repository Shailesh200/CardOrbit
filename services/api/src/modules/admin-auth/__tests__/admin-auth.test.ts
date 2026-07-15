import { createHmac } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { hash as bcryptHash } from 'bcryptjs';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { newUuidV7 } from '../../../infrastructure/prisma/uuid';
import {
  PrismaBankRepository,
  PrismaCardNetworkRepository,
  PrismaCreditCardRepository,
} from '../../cards/infrastructure/prisma-card-catalog.repository';
import { PrismaRewardRuleRepository } from '../../rewards/infrastructure/prisma-reward-rule.repository';
import { AdminAuthService } from '../admin-auth.service';
import { AdminAuditService } from '../admin-audit.service';
import { AdminBootstrapService } from '../admin-bootstrap.service';
import { signAdminJwt, verifyAdminJwt } from '../admin-jwt.guard';

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe('admin JWT guard (M-011)', () => {
  it('signs and verifies admin tokens with typ=admin', () => {
    const token = signAdminJwt({
      sub: '00000000-0000-7000-8000-000000000001',
      email: 'admin@example.com',
      role: 'ADMIN',
    });
    const payload = verifyAdminJwt(token);
    expect(payload.typ).toBe('admin');
    expect(payload.email).toBe('admin@example.com');
  });

  it('rejects tokens without typ=admin', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(
      JSON.stringify({
        sub: 'consumer-1',
        email: 'user@example.com',
        role: 'ADMIN',
        typ: 'consumer',
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString('base64url');
    const secret =
      process.env.ADMIN_JWT_SECRET || process.env.JWT_ACCESS_SECRET || 'change-me-admin-jwt-secret';
    const signature = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
    const consumerToken = `${header}.${body}.${signature}`;

    expect(() => verifyAdminJwt(consumerToken)).toThrow(/Consumer tokens|admin/i);
  });
});

describe.skipIf(!hasDatabase)('admin auth + mutations (M-011)', () => {
  const prisma = new PrismaService();
  const auth = new AdminAuthService(prisma);
  const audit = new AdminAuditService(prisma);
  const bootstrap = new AdminBootstrapService(prisma);
  const banks = new PrismaBankRepository(prisma);
  const networks = new PrismaCardNetworkRepository(prisma);
  const cards = new PrismaCreditCardRepository(prisma);
  const rewardRules = new PrismaRewardRuleRepository(prisma);

  const email = `m011-admin-${newUuidV7()}@cardwise.test`;
  const password = 'test-admin-password';

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.adminUser.create({
      data: {
        id: newUuidV7(),
        email,
        passwordHash: await bcryptHash(password, 10),
        role: 'ADMIN',
        active: true,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('logs in and returns access token', async () => {
    const result = await auth.login(email, password);
    expect(result.accessToken).toBeTruthy();
    expect(result.admin.email).toBe(email);
    const payload = verifyAdminJwt(result.accessToken);
    expect(payload.typ).toBe('admin');
  });

  it('rejects bad passwords', async () => {
    await expect(auth.login(email, 'wrong-password')).rejects.toThrow(/Invalid admin/);
  });

  it('creates card, archives it, and writes audit row', async () => {
    const id = newUuidV7();
    const bank = await banks.create({ name: `M011 Bank ${id}`, slug: `m011-bank-${id}` });
    const network = await networks.create({
      code: `M11_${id.replace(/-/g, '').slice(0, 12)}`,
      name: `M011 Net ${id}`,
      slug: `m011-net-${id}`,
    });
    const card = await cards.create({
      name: `M011 Card ${id}`,
      slug: `m011-card-${id}`,
      bankId: bank.id,
      networkId: network.id,
    });

    const admin = await auth.login(email, password);
    await audit.record(admin.admin, 'credit_card.create', 'credit_card', card.id, {
      slug: card.slug,
    });

    await cards.softDelete(card.id);
    await audit.record(admin.admin, 'credit_card.archive', 'credit_card', card.id);

    const found = await cards.findBySlug(`m011-card-${id}`);
    expect(found).toBeNull();

    const logs = await prisma.auditLog.findMany({
      where: { resourceId: card.id, action: { startsWith: 'credit_card.' } },
      orderBy: { createdAt: 'asc' },
    });
    expect(logs.length).toBeGreaterThanOrEqual(2);
    expect(logs[0]?.actorId).toBe(admin.admin.id);
  });

  it('activates reward rule version after create', async () => {
    const id = newUuidV7();
    const bank = await banks.create({ name: `M011R Bank ${id}`, slug: `m011r-bank-${id}` });
    const network = await networks.create({
      code: `M11R${id.replace(/-/g, '').slice(0, 11)}`,
      name: `M011R Net ${id}`,
      slug: `m011r-net-${id}`,
    });
    const card = await cards.create({
      name: `M011R Card ${id}`,
      slug: `m011r-card-${id}`,
      bankId: bank.id,
      networkId: network.id,
    });
    const rule = await rewardRules.createRule({
      ruleKey: `m011_rule_${id}`,
      name: `M011 Rule ${id}`,
      creditCardId: card.id,
    });
    const version = await rewardRules.createVersion({
      ruleId: rule.id,
      versionNumber: 1,
      payload: { rewardMultiplier: 2, cap: 5000, exclusions: [] },
    });
    const activated = await rewardRules.activateVersion(version.id);
    expect(activated.status).toBe('ACTIVE');
  });

  it('bootstrap is idempotent', async () => {
    process.env.ADMIN_BOOTSTRAP_EMAIL = `bootstrap-${newUuidV7()}@cardwise.test`;
    process.env.ADMIN_BOOTSTRAP_PASSWORD = 'bootstrap-pass';
    await bootstrap.ensureBootstrapAdmin();
    await bootstrap.ensureBootstrapAdmin();
    const count = await prisma.adminUser.count({
      where: { email: process.env.ADMIN_BOOTSTRAP_EMAIL },
    });
    expect(count).toBe(1);
  });
});
