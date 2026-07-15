import { Injectable, OnModuleInit } from '@nestjs/common';
import { hash as bcryptHash } from 'bcryptjs';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { newUuidV7 } from '../../infrastructure/prisma/uuid';

@Injectable()
export class AdminBootstrapService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.ensureBootstrapAdmin();
  }

  async ensureBootstrapAdmin(): Promise<void> {
    const email = (process.env.ADMIN_BOOTSTRAP_EMAIL ?? 'admin@cardwise.local').toLowerCase();
    const password = process.env.ADMIN_BOOTSTRAP_PASSWORD ?? 'cardwise-admin';
    const existing = await this.prisma.adminUser.findUnique({ where: { email } });
    if (existing) {
      return;
    }
    await this.prisma.adminUser.create({
      data: {
        id: newUuidV7(),
        email,
        passwordHash: await bcryptHash(password, 10),
        role: 'ADMIN',
        active: true,
      },
    });
  }
}
