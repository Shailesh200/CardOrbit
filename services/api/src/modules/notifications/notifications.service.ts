import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import {
  initAnalytics,
  trackNotificationClicked,
  trackNotificationsViewed,
} from '@cardwise/analytics';
import {
  parseNotificationPreferences,
  type ContextualNotificationSyncResult,
} from '@cardwise/validation';

import { MailService } from '../../infrastructure/mail/mail.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ContextualNotificationsService } from './contextual-notifications.service';
import { toNotificationDto, type NotificationDto } from './notification.mapper';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private analyticsReady = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly contextual: ContextualNotificationsService,
  ) {}

  async list(
    userId: string,
    limit = 20,
    offset = 0,
    options?: { syncContextual?: boolean },
  ): Promise<{ items: NotificationDto[]; total: number; sync?: ContextualNotificationSyncResult }> {
    await this.requireActiveUser(userId);

    let sync: ContextualNotificationSyncResult | undefined;
    if (options?.syncContextual !== false) {
      sync = await this.contextual.syncForUser(userId).catch((error) => {
        this.logger.warn(
          `Contextual sync failed for ${userId}: ${error instanceof Error ? error.message : String(error)}`,
        );
        return undefined;
      });
    }

    const take = Math.min(Math.max(limit, 1), 50);
    const skip = Math.max(offset, 0);

    const [rows, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    const items = rows.map(toNotificationDto);
    const unreadCount = items.filter((item) => item.readAt == null).length;
    const contextualEnabled = await this.contextual.isEnabled(userId);
    this.trackViewed(userId, {
      total,
      unreadCount,
      contextualEnabled,
    });

    return { items, total, ...(sync ? { sync } : {}) };
  }

  async unreadCount(userId: string): Promise<{ count: number }> {
    await this.requireActiveUser(userId);
    await this.contextual.syncForUser(userId).catch(() => undefined);
    const count = await this.prisma.notification.count({
      where: { userId, readAt: null },
    });
    return { count };
  }

  async syncContextual(userId: string): Promise<ContextualNotificationSyncResult> {
    await this.requireActiveUser(userId);
    return this.contextual.syncForUser(userId);
  }

  async markRead(userId: string, notificationId: string): Promise<NotificationDto> {
    await this.requireActiveUser(userId);
    const row = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!row) {
      throw new NotFoundException('Notification not found');
    }
    if (row.readAt) {
      return toNotificationDto(row);
    }
    const updated = await this.prisma.notification.update({
      where: { id: row.id },
      data: { readAt: new Date() },
    });
    this.trackClicked(userId, {
      notificationId: updated.id,
      type: updated.type,
      linkUrl: updated.linkUrl ?? undefined,
    });
    return toNotificationDto(updated);
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    await this.requireActiveUser(userId);
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  /** Creates welcome in-app notification and optional email (respects emailProduct pref). */
  async deliverWelcome(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.accountStatus !== 'ACTIVE') {
      return;
    }

    const existing = await this.prisma.notification.findFirst({
      where: { userId, type: 'WELCOME' },
    });
    if (existing) {
      return;
    }

    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const firstName = user.fullName?.trim().split(/\s+/)[0] ?? null;

    await this.prisma.notification.create({
      data: {
        userId,
        type: 'WELCOME',
        title: 'Welcome to CardWise',
        body: 'Add your cards and search a merchant to get your first live recommendation.',
        linkUrl: '/account/cards',
      },
    });

    const prefs = parseNotificationPreferences(user.notificationPreferences);
    if (!prefs.emailProduct) {
      return;
    }

    try {
      await this.mail.sendWelcomeEmail(user.email, { firstName, appUrl });
    } catch (error) {
      this.logger.warn(
        `Welcome email failed for ${user.email}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async requireActiveUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.accountStatus !== 'ACTIVE') {
      throw new UnauthorizedException('User not found');
    }
  }

  private trackViewed(
    userId: string,
    properties: { total: number; unreadCount: number; contextualEnabled: boolean },
  ) {
    try {
      if (!this.analyticsReady) {
        initAnalytics({});
        this.analyticsReady = true;
      }
      trackNotificationsViewed(properties, { distinctId: userId });
    } catch {
      // ignore
    }
  }

  private trackClicked(
    userId: string,
    properties: { notificationId: string; type: string; linkUrl?: string },
  ) {
    try {
      if (!this.analyticsReady) {
        initAnalytics({});
        this.analyticsReady = true;
      }
      trackNotificationClicked(properties, { distinctId: userId });
    } catch {
      // ignore
    }
  }
}
