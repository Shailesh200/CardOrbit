import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { hash as bcryptHash } from 'bcryptjs';

import { MailService } from '../../../infrastructure/mail/mail.service';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { ContextualNotificationsService } from '../contextual-notifications.service';
import { NotificationsService } from '../notifications.service';

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)('notifications (M-022)', () => {
  const prisma = new PrismaService();
  const mail = {
    sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
    send: vi.fn().mockResolvedValue(undefined),
  } as unknown as MailService;
  const contextual = {
    syncForUser: vi.fn().mockResolvedValue({ delivered: 0, candidates: 0, skipped: 0 }),
    isEnabled: vi.fn().mockResolvedValue(true),
  } as unknown as ContextualNotificationsService;
  const notifications = new NotificationsService(prisma, mail, contextual);

  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function createUser(email: string, notificationPreferences: object = {}) {
    return prisma.user.create({
      data: {
        email,
        passwordHash: await bcryptHash('Str0ng!Passw0rd', 10),
        emailVerifiedAt: new Date(),
        fullName: 'Asha Patel',
        role: 'USER',
        notificationPreferences,
      },
    });
  }

  it('delivers welcome in-app notification and email once', async () => {
    const email = `m022-welcome-${Date.now()}@cardwise.test`;
    const user = await createUser(email);

    await notifications.deliverWelcome(user.id);
    await notifications.deliverWelcome(user.id);

    const rows = await prisma.notification.findMany({ where: { userId: user.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.type).toBe('WELCOME');
    expect(rows[0]?.title).toContain('Welcome');
    expect(mail.sendWelcomeEmail).toHaveBeenCalledTimes(1);
  });

  it('skips welcome email when emailProduct is disabled', async () => {
    const email = `m022-no-email-${Date.now()}@cardwise.test`;
    const user = await createUser(email, {
      emailProduct: false,
      emailMarketing: false,
      emailSecurity: true,
    });

    await notifications.deliverWelcome(user.id);

    expect(mail.sendWelcomeEmail).not.toHaveBeenCalled();
    const count = await prisma.notification.count({ where: { userId: user.id } });
    expect(count).toBe(1);
  });

  it('lists, counts unread, and marks notifications read', async () => {
    const email = `m022-inbox-${Date.now()}@cardwise.test`;
    const user = await createUser(email);

    await notifications.deliverWelcome(user.id);

    const list = await notifications.list(user.id);
    expect(list.total).toBe(1);
    expect(list.items[0]?.readAt).toBeNull();
    expect(contextual.syncForUser).toHaveBeenCalled();

    const unread = await notifications.unreadCount(user.id);
    expect(unread.count).toBe(1);

    const marked = await notifications.markRead(user.id, list.items[0]!.id);
    expect(marked.readAt).not.toBeNull();
    expect((await notifications.unreadCount(user.id)).count).toBe(0);

    const allRead = await notifications.markAllRead(user.id);
    expect(allRead.updated).toBe(0);
  });
});
