import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { hash as bcryptHash } from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';

import { MailService } from '../../../infrastructure/mail/mail.service';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { AuthService } from '../../auth/auth.service';
import { AuthTokenService } from '../../auth/auth-token.service';
import { UsersService } from '../users.service';

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)('user profile & settings (M-013)', () => {
  const prisma = new PrismaService();
  const users = new UsersService(prisma);
  const jwt = new JwtService({
    secret: process.env.JWT_ACCESS_SECRET || 'change-me-use-openssl-rand-base64-32',
  });
  const tokens = new AuthTokenService(jwt, prisma);
  const mail = {
    sendVerificationEmail: async () => undefined,
    sendPasswordResetEmail: async () => undefined,
    send: async () => undefined,
  } as unknown as MailService;
  const notifications = {
    deliverWelcome: async () => undefined,
  } as unknown as import('../../notifications/notifications.service').NotificationsService;
  const auth = new AuthService(prisma, tokens, mail, notifications);

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function createVerifiedUser(email: string, password = 'Str0ng!Passw0rd') {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await bcryptHash(password, 10),
        emailVerifiedAt: new Date(),
        fullName: 'Test User',
        role: 'USER',
      },
    });
    return user;
  }

  it('returns Indian defaults on GET profile', async () => {
    const email = `m013-defaults-${Date.now()}@cardwise.test`;
    const user = await createVerifiedUser(email);
    const profile = await users.getMe(user.id);
    expect(profile.country).toBe('IN');
    expect(profile.currency).toBe('INR');
    expect(profile.locale).toBe('en-IN');
    expect(profile.timezone).toBe('Asia/Kolkata');
    expect(profile.firstName).toBe('Test');
    expect(profile.lastName).toBe('User');
  });

  it('patches profile and rejects email changes', async () => {
    const email = `m013-patch-${Date.now()}@cardwise.test`;
    const user = await createVerifiedUser(email);
    await expect(users.updateMe(user.id, { email: 'new@example.com' })).rejects.toThrow(
      /cannot be changed/i,
    );
    const updated = await users.updateMe(user.id, {
      firstName: 'Asha',
      lastName: 'Patel',
      timezone: 'Asia/Kolkata',
    });
    expect(updated.fullName).toBe('Asha Patel');
    expect(updated.firstName).toBe('Asha');
  });

  it('round-trips notification and privacy preferences', async () => {
    const email = `m013-prefs-${Date.now()}@cardwise.test`;
    const user = await createVerifiedUser(email);
    const notifications = await users.putNotifications(user.id, {
      emailMarketing: true,
      emailProduct: false,
      emailSecurity: true,
    });
    expect(notifications.emailMarketing).toBe(true);
    expect((await users.getNotifications(user.id)).emailProduct).toBe(false);

    const privacy = await users.putPrivacy(user.id, {
      shareAnonymousAnalytics: false,
      personalizedOffers: true,
    });
    expect(privacy.shareAnonymousAnalytics).toBe(false);
    expect((await users.getPrivacy(user.id)).personalizedOffers).toBe(true);
  });

  it('round-trips reward personalization profile', async () => {
    const email = `m028-prefs-${Date.now()}@cardwise.test`;
    const user = await createVerifiedUser(email);
    const saved = await users.putRewardPersonalization(user.id, {
      preferredRewardType: 'cashback',
      preferredBankSlugs: ['hdfc', 'axis'],
      boostFavoriteCards: false,
    });
    expect(saved.preferredRewardType).toBe('cashback');
    expect(saved.preferredBankSlugs).toEqual(['hdfc', 'axis']);
    expect(saved.boostFavoriteCards).toBe(false);

    const loaded = await users.getRewardPersonalization(user.id);
    expect(loaded.preferredBankSlugs).toEqual(['hdfc', 'axis']);
  });

  it('changes password and rejects wrong current password', async () => {
    const email = `m013-pwd-${Date.now()}@cardwise.test`;
    const password = 'Str0ng!Passw0rd';
    const user = await createVerifiedUser(email, password);
    await expect(auth.changePassword(user.id, 'WrongPass!1234', 'N3w!Passw0rdXY')).rejects.toThrow(
      /incorrect|Unauthorized/i,
    );
    await auth.changePassword(user.id, password, 'N3w!Passw0rdXY');
    await expect(auth.login(email, password)).rejects.toThrow();
    const session = await auth.login(email, 'N3w!Passw0rdXY');
    expect(session.user.email).toBe(email);
  });

  it('admin lookup returns profile without secrets', async () => {
    const email = `m013-admin-${Date.now()}@cardwise.test`;
    const user = await createVerifiedUser(email);
    const dto = await users.adminGetById(user.id);
    expect(dto.email).toBe(email);
    expect(dto).not.toHaveProperty('passwordHash');
    const byEmail = await users.adminGetByEmail(email);
    expect(byEmail.id).toBe(user.id);
  });
});
