import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class PrivacyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  async requestExport(userId: string) {
    const exportId = `exp_${randomUUID().replace(/-/g, '').slice(0, 16)}`;

    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'USER_EXPORT_REQUESTED',
        resource: 'user',
        resourceId: userId,
        metadata: { exportId, status: 'pending' },
      },
    });

    return {
      exportId,
      status: 'pending' as const,
      message: 'Export request accepted. Download will be available when processing completes.',
    };
  }

  async requestDeletion(userId: string) {
    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'USER_DELETION_REQUESTED',
        resource: 'user',
        resourceId: userId,
        metadata: { status: 'deletion_scheduled' },
      },
    });

    const result = await this.users.deleteAccountSelf(userId);

    return {
      status: result.status,
      message:
        result.status === 'deleted' ? 'Account deleted.' : 'Account deletion has been scheduled.',
    };
  }
}
