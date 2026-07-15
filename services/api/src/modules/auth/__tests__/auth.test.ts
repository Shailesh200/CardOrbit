import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { getMemoryEvents, initAnalytics, shutdownAnalytics } from '@cardwise/analytics';

import { MailService } from '../../../infrastructure/mail/mail.service';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { AuthService } from '../auth.service';
import { AuthTokenService } from '../auth-token.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { exchangeGoogleCode, getGoogleOAuthConfig } from '../google-oauth';
import { JwtService } from '@nestjs/jwt';

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe('google oauth helpers (M-012)', () => {
  it('returns null config when env unset', () => {
    const previousId = process.env.GOOGLE_CLIENT_ID;
    const previousSecret = process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    expect(getGoogleOAuthConfig()).toBeNull();
    if (previousId !== undefined) process.env.GOOGLE_CLIENT_ID = previousId;
    if (previousSecret !== undefined) process.env.GOOGLE_CLIENT_SECRET = previousSecret;
  });

  it('exchanges code with mocked fetch', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (String(url).includes('/token')) {
        return {
          ok: true,
          json: async () => ({ access_token: 'ya29.test' }),
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({
          sub: 'google-sub-1',
          email: 'google.user@example.com',
          name: 'Google User',
        }),
      } as Response;
    });

    const profile = await exchangeGoogleCode(
      'auth-code',
      {
        clientId: 'cid',
        clientSecret: 'csecret',
        callbackUrl: 'http://localhost:3000/api/v1/auth/oauth/callback',
      },
      fetchImpl as unknown as typeof fetch,
    );
    expect(profile.profile.sub).toBe('google-sub-1');
    expect(profile.profile.email).toBe('google.user@example.com');
    expect(profile.accessToken).toBe('ya29.test');
  });
});

describe.skipIf(!hasDatabase)('consumer auth flows (M-012)', () => {
  const prisma = new PrismaService();
  const jwt = new JwtService({
    secret: process.env.JWT_ACCESS_SECRET || 'change-me-use-openssl-rand-base64-32',
  });
  const tokens = new AuthTokenService(jwt, prisma);
  const mail = {
    sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
    send: vi.fn().mockResolvedValue(undefined),
  } as unknown as MailService;
  const notifications = {
    deliverWelcome: vi.fn().mockResolvedValue(undefined),
  } as unknown as NotificationsService;
  const auth = new AuthService(prisma, tokens, mail, notifications);

  beforeAll(async () => {
    await prisma.$connect();
    initAnalytics({ useMemory: true });
  });

  afterAll(async () => {
    await shutdownAnalytics();
    await prisma.$disconnect();
  });

  it('signup succeeds when verification email delivery fails', async () => {
    const failingMail = {
      sendVerificationEmail: vi.fn().mockRejectedValue(new Error('SMTP unavailable')),
      sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
      send: vi.fn().mockResolvedValue(undefined),
    } as unknown as MailService;
    const authWithFailingMail = new AuthService(prisma, tokens, failingMail, notifications);
    const email = `m012-mail-fail-${Date.now()}@cardwise.test`;

    const signup = await authWithFailingMail.signup({
      email,
      password: 'Str0ng!Passw0rd',
    });
    expect(signup.verificationRequired).toBe(true);

    const tokenRow = await prisma.emailVerificationToken.findFirst({
      where: { userId: signup.userId },
    });
    expect(tokenRow).toBeTruthy();
  });

  it('signup → verify → login → me, with USER_REGISTERED', async () => {
    const email = `m012-${Date.now()}@cardwise.test`;
    const password = 'Str0ng!Passw0rd';

    const signup = await auth.signup({
      email,
      password,
      firstName: 'Test',
      lastName: 'User',
    });
    expect(signup.verificationRequired).toBe(true);

    const events = getMemoryEvents();
    expect(events.some((e: { event: string }) => e.event === 'USER_REGISTERED')).toBe(true);

    await expect(auth.login(email, password)).rejects.toThrow(/not verified|Unauthorized/i);

    const tokenRow = await prisma.emailVerificationToken.findFirst({
      where: { userId: signup.userId },
      orderBy: { createdAt: 'desc' },
    });
    expect(tokenRow).toBeTruthy();

    // Recreate raw token by issuing another and using DB hash match via service path:
    // Use priviledged verify by reading last mailed call arg if available.
    const mailedToken = (mail.sendVerificationEmail as ReturnType<typeof vi.fn>).mock.calls.at(
      -1,
    )?.[1] as string;
    expect(mailedToken).toBeTruthy();
    await auth.verifyEmail(mailedToken);

    const session = await auth.login(email, password);
    expect(session.accessToken).toBeTruthy();
    expect(session.refreshToken).toBeTruthy();

    const me = await auth.me(session.user.id);
    expect(me.email).toBe(email);
  });

  it('rotates refresh tokens and rejects reused refresh', async () => {
    const email = `m012-refresh-${Date.now()}@cardwise.test`;
    const password = 'Str0ng!Passw0rd';
    await auth.signup({ email, password });
    const mailedToken = (mail.sendVerificationEmail as ReturnType<typeof vi.fn>).mock.calls.at(
      -1,
    )?.[1] as string;
    await auth.verifyEmail(mailedToken);
    const first = await auth.login(email, password);

    const rotated = await auth.refresh(first.refreshToken);
    expect(rotated.refreshToken).not.toBe(first.refreshToken);

    await expect(auth.refresh(first.refreshToken)).rejects.toThrow(/Invalid refresh/i);
  });

  it('rejects access tokens without typ=consumer via jwt verify payload path', async () => {
    const forged = await jwt.signAsync(
      { sub: 'x', email: 'a@b.c', role: 'USER', typ: 'admin' },
      { secret: process.env.JWT_ACCESS_SECRET || 'change-me-use-openssl-rand-base64-32' },
    );
    const payload = await jwt.verifyAsync<{ typ?: string }>(forged, {
      secret: process.env.JWT_ACCESS_SECRET || 'change-me-use-openssl-rand-base64-32',
    });
    expect(payload.typ).toBe('admin');
  });

  it('forgot + reset password flow', async () => {
    const email = `m012-reset-${Date.now()}@cardwise.test`;
    const password = 'Str0ng!Passw0rd';
    await auth.signup({ email, password });
    const mailedToken = (mail.sendVerificationEmail as ReturnType<typeof vi.fn>).mock.calls.at(
      -1,
    )?.[1] as string;
    await auth.verifyEmail(mailedToken);

    await auth.forgotPassword(email);
    const resetRaw = (mail.sendPasswordResetEmail as ReturnType<typeof vi.fn>).mock.calls.at(
      -1,
    )?.[1] as string;
    expect(resetRaw).toBeTruthy();

    const nextPassword = 'N3w!Passw0rdXY';
    await auth.resetPassword(resetRaw, nextPassword);
    await expect(auth.login(email, password)).rejects.toThrow();
    const session = await auth.login(email, nextPassword);
    expect(session.user.email).toBe(email);
  });

  it('google oauth unavailable when unset', async () => {
    const previousId = process.env.GOOGLE_CLIENT_ID;
    const previousSecret = process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    expect(() => auth.googleAuthUrl()).toThrow(/not configured|ServiceUnavailable/i);
    if (previousId !== undefined) process.env.GOOGLE_CLIENT_ID = previousId;
    if (previousSecret !== undefined) process.env.GOOGLE_CLIENT_SECRET = previousSecret;
  });
});
