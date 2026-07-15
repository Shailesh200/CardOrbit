import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import type { AdminPrincipal } from './admin-auth.types';

@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    actor: AdminPrincipal,
    action: string,
    resource: string,
    resourceId?: string | null,
    metadata?: unknown,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action,
        resource,
        resourceId: resourceId ?? null,
        metadata: metadata as never,
      },
    });
  }
}
