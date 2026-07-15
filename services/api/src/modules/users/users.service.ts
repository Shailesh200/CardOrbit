import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  mergeRewardPersonalizationProfile,
  parseNotificationPreferences,
  parsePrivacyPreferences,
  type NotificationPreferences,
  type PrivacyPreferences,
  type RewardPersonalizationProfile,
} from '@cardwise/validation';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  joinFullName,
  notificationPrefsFromUser,
  privacyPrefsFromUser,
  rewardPersonalizationFromUser,
  toAdminUserDetailDto,
  toUserProfileDto,
  type AdminUserDetailDto,
  type UserProfileDto,
} from './user-profile.mapper';

export type UpdateProfileInput = {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  country?: string;
  currency?: string;
  locale?: string;
  timezone?: string;
  avatarUrl?: string | null;
  email?: unknown;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string): Promise<UserProfileDto> {
    const user = await this.requireActiveUser(userId);
    return toUserProfileDto(user);
  }

  async updateMe(userId: string, input: UpdateProfileInput): Promise<UserProfileDto> {
    if (input.email !== undefined) {
      throw new BadRequestException('Email cannot be changed via profile update');
    }

    if (input.firstName !== undefined) {
      this.assertName(input.firstName, 'firstName');
    }
    if (input.lastName !== undefined) {
      this.assertName(input.lastName, 'lastName');
    }
    if (input.timezone !== undefined && !input.timezone.trim()) {
      throw new BadRequestException('timezone must be a non-empty IANA timezone');
    }
    if (input.currency !== undefined && input.currency !== 'INR') {
      throw new BadRequestException('Only INR currency is supported in M-013');
    }
    if (input.country !== undefined && input.country.length !== 2) {
      throw new BadRequestException('country must be a 2-letter ISO code');
    }

    let fullName: string | null | undefined;
    if (input.fullName !== undefined) {
      fullName = input.fullName.trim() || null;
    } else if (input.firstName !== undefined || input.lastName !== undefined) {
      const current = await this.requireActiveUser(userId);
      const currentSplit = toUserProfileDto(current);
      fullName = joinFullName(
        input.firstName !== undefined ? input.firstName : currentSplit.firstName,
        input.lastName !== undefined ? input.lastName : currentSplit.lastName,
      );
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(fullName !== undefined ? { fullName } : {}),
        ...(input.country !== undefined ? { country: input.country.toUpperCase() } : {}),
        ...(input.currency !== undefined ? { currency: input.currency } : {}),
        ...(input.locale !== undefined ? { locale: input.locale } : {}),
        ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
        ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
      },
    });

    return toUserProfileDto(user);
  }

  async getNotifications(userId: string): Promise<NotificationPreferences> {
    const user = await this.requireActiveUser(userId);
    return notificationPrefsFromUser(user);
  }

  async putNotifications(userId: string, input: unknown): Promise<NotificationPreferences> {
    const prefs = parseNotificationPreferences(input);
    await this.prisma.user.update({
      where: { id: userId },
      data: { notificationPreferences: prefs as object },
    });
    return prefs;
  }

  async getPrivacy(userId: string): Promise<PrivacyPreferences> {
    const user = await this.requireActiveUser(userId);
    return privacyPrefsFromUser(user);
  }

  async putPrivacy(userId: string, input: unknown): Promise<PrivacyPreferences> {
    const prefs = parsePrivacyPreferences(input);
    await this.prisma.user.update({
      where: { id: userId },
      data: { privacyPreferences: prefs as object },
    });
    return prefs;
  }

  async getRewardPersonalization(userId: string): Promise<RewardPersonalizationProfile> {
    const user = await this.requireActiveUser(userId);
    return rewardPersonalizationFromUser(user);
  }

  async putRewardPersonalization(
    userId: string,
    input: unknown,
  ): Promise<RewardPersonalizationProfile> {
    const user = await this.requireActiveUser(userId);
    const merged = mergeRewardPersonalizationProfile(user.personalizationProfile, input);
    await this.prisma.user.update({
      where: { id: userId },
      data: { personalizationProfile: merged as object },
    });
    return merged;
  }

  async adminGetById(id: string): Promise<AdminUserDetailDto> {
    return this.adminGetDetail(id);
  }

  async adminGetByEmail(email: string): Promise<AdminUserDetailDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user) {
      throw new NotFoundException(`User ${email} not found`);
    }
    return this.adminGetDetail(user.id);
  }

  async adminListUsers(query: { limit?: number; offset?: number; search?: string }) {
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
    const offset = Math.max(query.offset ?? 0, 0);
    const search = query.search?.trim();

    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { fullName: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        select: {
          id: true,
          email: true,
          fullName: true,
          accountStatus: true,
          createdAt: true,
          _count: { select: { userCards: { where: { status: { not: 'REMOVED' } } } } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        email: row.email,
        displayName: row.fullName ?? '—',
        accountStatus: row.accountStatus,
        cardCount: row._count.userCards,
        createdAt: row.createdAt.toISOString(),
      })),
      total,
      limit,
      offset,
    };
  }

  private async adminGetDetail(id: string): Promise<AdminUserDetailDto> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    const [portfolioCardCount, activeSessionCount] = await Promise.all([
      this.prisma.userCard.count({
        where: { userId: id, status: { not: 'REMOVED' } },
      }),
      this.prisma.session.count({
        where: { userId: id, revokedAt: null, expiresAt: { gt: new Date() } },
      }),
    ]);
    return toAdminUserDetailDto(user, { portfolioCardCount, activeSessionCount });
  }

  /** Self-service account deletion — hard delete in dev, soft delete in production. */
  async deleteAccountSelf(userId: string): Promise<{ status: 'deleted' | 'deletion_scheduled' }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.accountStatus !== 'ACTIVE') {
      throw new UnauthorizedException('User not found');
    }

    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    if (process.env.NODE_ENV !== 'production') {
      await this.prisma.user.delete({ where: { id: userId } });
      return { status: 'deleted' };
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        accountStatus: 'DELETED',
        email: `deleted+${userId}@cardwise.invalid`,
        fullName: null,
        passwordHash: null,
        googleSub: null,
        avatarUrl: null,
      },
    });

    return { status: 'deletion_scheduled' };
  }

  /** Dev-only — permanently removes a consumer user and cascaded rows. */
  async adminDeleteUser(id: string): Promise<{ deleted: true; id: string }> {
    if (process.env.NODE_ENV === 'production' && process.env.ADMIN_USER_DELETE !== 'true') {
      throw new ForbiddenException('Admin user delete is disabled in production');
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    await this.prisma.user.delete({ where: { id } });
    return { deleted: true, id };
  }

  private async requireActiveUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.accountStatus !== 'ACTIVE') {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  private assertName(value: string, field: string): void {
    const trimmed = value.trim();
    if (trimmed.length < 2 || trimmed.length > 50) {
      throw new BadRequestException(`${field} must be 2–50 characters`);
    }
  }
}
