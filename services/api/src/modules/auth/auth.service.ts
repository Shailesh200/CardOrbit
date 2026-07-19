import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AnalyticsEvent,
  initAnalytics,
  trackAuthLoginFailed,
  trackEmailVerified,
  trackEvent,
  trackGmailConnected,
  trackUserLoggedIn,
  trackUserLoggedOut,
} from '@cardwise/analytics';
import { PasswordSchema } from '@cardwise/validation';
import { compare as bcryptCompare, hash as bcryptHash } from 'bcryptjs';

import { MailService } from '../../infrastructure/mail/mail.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthTokenService } from './auth-token.service';
import type { AuthTokenPair, ConsumerPrincipal } from './auth.types';
import { exchangeGoogleCode, getGoogleOAuthConfig, getGoogleAuthUrl } from './google-oauth';
import { upsertMailSyncMailbox } from '../mail-sync/mailbox-store';

let analyticsReady = false;

function ensureAnalytics(): void {
  if (!analyticsReady) {
    initAnalytics({
      apiKey: process.env.POSTHOG_API_KEY,
      host: process.env.POSTHOG_HOST,
      useMemory: !process.env.POSTHOG_API_KEY,
    });
    analyticsReady = true;
  }
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: AuthTokenService,
    private readonly mail: MailService,
    private readonly notifications: NotificationsService,
  ) {}

  async signup(input: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }): Promise<{ userId: string; verificationRequired: true }> {
    const parsedPassword = PasswordSchema.safeParse(input.password);
    if (!parsedPassword.success) {
      throw new BadRequestException({
        code: 'AUTH-003',
        message: parsedPassword.error.issues[0]?.message ?? 'Weak password',
      });
    }

    const email = input.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException({ code: 'AUTH-001', message: 'Email already exists' });
    }

    const fullName = [input.firstName, input.lastName].filter(Boolean).join(' ') || null;
    const user = await this.prisma.user.create({
      data: {
        email,
        fullName,
        passwordHash: await bcryptHash(parsedPassword.data, 10),
        role: 'USER',
      },
    });

    await this.issueVerificationEmail(user.id, user.email);

    ensureAnalytics();
    trackEvent(
      AnalyticsEvent.USER_REGISTERED,
      { method: 'email', source: 'api' },
      { distinctId: user.id },
    );

    return { userId: user.id, verificationRequired: true };
  }

  async verifyEmail(verificationToken: string): Promise<{ verified: true }> {
    const tokenHash = this.tokens.hash(verificationToken);
    const row = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
    });
    if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: row.userId } });
    const firstVerification = !user?.emailVerifiedAt;

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: row.userId },
        data: { emailVerifiedAt: new Date() },
      }),
    ]);

    if (firstVerification) {
      ensureAnalytics();
      const hoursSinceSignup =
        user?.createdAt != null
          ? Math.max(0, (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60))
          : undefined;
      trackEmailVerified(
        {
          method: 'email',
          ...(hoursSinceSignup != null
            ? { hoursSinceSignup: Math.round(hoursSinceSignup * 10) / 10 }
            : {}),
        },
        { distinctId: row.userId },
      );
      void this.notifications.deliverWelcome(row.userId).catch((error) => {
        this.logger.warn(
          `Welcome delivery failed for ${row.userId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
    }

    return { verified: true };
  }

  async resendVerification(email: string): Promise<{ ok: true }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (user && !user.emailVerifiedAt) {
      await this.issueVerificationEmail(user.id, user.email);
    }
    return { ok: true };
  }

  async login(
    email: string,
    password: string,
  ): Promise<AuthTokenPair & { user: ConsumerPrincipal }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user?.passwordHash) {
      ensureAnalytics();
      trackAuthLoginFailed({ method: 'email', reason: 'invalid_credentials' });
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.emailVerifiedAt) {
      ensureAnalytics();
      trackAuthLoginFailed(
        { method: 'email', reason: 'email_unverified' },
        { distinctId: user.id },
      );
      throw new UnauthorizedException('Email not verified');
    }
    if (user.accountStatus !== 'ACTIVE') {
      ensureAnalytics();
      trackAuthLoginFailed({ method: 'email', reason: 'inactive' }, { distinctId: user.id });
      throw new UnauthorizedException('Account not active');
    }
    const ok = await bcryptCompare(password, user.passwordHash);
    if (!ok) {
      ensureAnalytics();
      trackAuthLoginFailed(
        { method: 'email', reason: 'invalid_credentials' },
        { distinctId: user.id },
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    const principal: ConsumerPrincipal = {
      id: user.id,
      email: user.email,
      role: 'USER',
    };
    const pair = await this.tokens.issueTokenPair(principal);
    ensureAnalytics();
    trackUserLoggedIn(
      { method: 'email', isReturning: true, surface: 'api' },
      { distinctId: user.id },
    );
    return { ...pair, user: principal };
  }

  async refresh(refreshToken: string): Promise<AuthTokenPair> {
    try {
      return await this.tokens.rotateRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(refreshToken: string): Promise<{ ok: true }> {
    const tokenHash = this.tokens.hash(refreshToken);
    const session = await this.prisma.session.findFirst({
      where: { tokenHash, revokedAt: null },
      select: { userId: true },
    });
    await this.tokens.revokeRefreshToken(refreshToken);
    if (session) {
      ensureAnalytics();
      trackUserLoggedOut({ scope: 'current', surface: 'api' }, { distinctId: session.userId });
    }
    return { ok: true };
  }

  async logoutAll(userId: string): Promise<{ ok: true }> {
    await this.tokens.revokeAllSessions(userId);
    ensureAnalytics();
    trackUserLoggedOut({ scope: 'all', surface: 'api' }, { distinctId: userId });
    return { ok: true };
  }

  async forgotPassword(email: string): Promise<{ ok: true }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (user?.passwordHash) {
      const raw = this.tokens.createOpaqueToken();
      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: this.tokens.hash(raw),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
      try {
        await this.mail.sendPasswordResetEmail(user.email, raw);
      } catch (error) {
        this.logger.warn(
          `Password reset email failed for ${user.email}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    return { ok: true };
  }

  async resetPassword(token: string, password: string): Promise<{ ok: true }> {
    const parsedPassword = PasswordSchema.safeParse(password);
    if (!parsedPassword.success) {
      throw new BadRequestException({
        code: 'AUTH-003',
        message: parsedPassword.error.issues[0]?.message ?? 'Weak password',
      });
    }

    const tokenHash = this.tokens.hash(token);
    const row = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: row.userId },
        data: { passwordHash: await bcryptHash(parsedPassword.data, 10) },
      }),
    ]);
    await this.tokens.revokeAllSessions(row.userId);
    return { ok: true };
  }

  async me(userId: string): Promise<ConsumerPrincipal & { fullName: string | null }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.accountStatus !== 'ACTIVE') {
      throw new UnauthorizedException('User not found');
    }
    return {
      id: user.id,
      email: user.email,
      role: 'USER',
      fullName: user.fullName,
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ ok: true }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.accountStatus !== 'ACTIVE') {
      throw new UnauthorizedException('User not found');
    }
    if (!user.passwordHash) {
      throw new BadRequestException('Password login is not set for this account');
    }
    const ok = await bcryptCompare(currentPassword, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    const parsedPassword = PasswordSchema.safeParse(newPassword);
    if (!parsedPassword.success) {
      throw new BadRequestException({
        code: 'AUTH-003',
        message: parsedPassword.error.issues[0]?.message ?? 'Weak password',
      });
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcryptHash(parsedPassword.data, 10) },
    });
    await this.tokens.revokeAllSessions(userId);
    return { ok: true };
  }

  googleAuthUrl(): string {
    const config = getGoogleOAuthConfig();
    if (!config) {
      throw new ServiceUnavailableException('Google OAuth is not configured');
    }
    return getGoogleAuthUrl(config, { intent: 'login' });
  }

  async googleCallback(code: string): Promise<AuthTokenPair & { user: ConsumerPrincipal }> {
    const config = getGoogleOAuthConfig();
    if (!config) {
      throw new ServiceUnavailableException('Google OAuth is not configured');
    }

    const { profile, refreshToken, scopes } = await exchangeGoogleCode(code, config);
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ googleSub: profile.sub }, { email: profile.email.toLowerCase() }],
      },
    });

    let isNew = false;
    if (!user) {
      isNew = true;
      user = await this.prisma.user.create({
        data: {
          email: profile.email.toLowerCase(),
          fullName: profile.name ?? null,
          googleSub: profile.sub,
          emailVerifiedAt: new Date(),
          role: 'USER',
        },
      });
    } else {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          googleSub: user.googleSub ?? profile.sub,
          emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
          fullName: user.fullName ?? profile.name ?? null,
        },
      });
    }

    let mailboxLinked = false;
    try {
      await upsertMailSyncMailbox(this.prisma, {
        userId: user.id,
        email: profile.email,
        googleSub: profile.sub,
        refreshToken,
        scopes,
        isPrimary: true,
      });
      mailboxLinked = true;
    } catch (error) {
      this.logger.warn(
        `Primary mailbox upsert failed for ${user.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    ensureAnalytics();
    if (isNew) {
      trackEvent(
        AnalyticsEvent.USER_REGISTERED,
        { method: 'google', source: 'api' },
        { distinctId: user.id },
      );
      void this.notifications.deliverWelcome(user.id).catch((error) => {
        this.logger.warn(
          `Welcome delivery failed for ${user.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
    }
    trackUserLoggedIn(
      { method: 'google', isReturning: !isNew, surface: 'api' },
      { distinctId: user.id },
    );
    if (mailboxLinked) {
      const mailboxCount = await this.prisma.mailSyncMailbox.count({
        where: { userId: user.id, status: { not: 'DISCONNECTED' } },
      });
      trackGmailConnected(
        {
          isPrimary: true,
          mailboxCount,
          source: 'oauth_login_upsert',
        },
        { distinctId: user.id },
      );
    }

    const principal: ConsumerPrincipal = {
      id: user.id,
      email: user.email,
      role: 'USER',
    };
    const pair = await this.tokens.issueTokenPair(principal);
    return { ...pair, user: principal };
  }

  private async issueVerificationEmail(userId: string, email: string): Promise<void> {
    const raw = this.tokens.createOpaqueToken();
    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: this.tokens.hash(raw),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    try {
      await this.mail.sendVerificationEmail(email, raw);
    } catch (error) {
      // Account is created — do not fail signup when SMTP/Mailpit is unavailable locally.
      this.logger.warn(
        `Verification email failed for ${email}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
