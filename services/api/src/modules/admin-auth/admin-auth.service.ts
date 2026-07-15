import { Injectable, UnauthorizedException } from '@nestjs/common';
import { compare as bcryptCompare } from 'bcryptjs';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { signAdminJwt } from './admin-jwt.guard';
import type { AdminPrincipal } from './admin-auth.types';

@Injectable()
export class AdminAuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(
    email: string,
    password: string,
  ): Promise<{
    accessToken: string;
    admin: AdminPrincipal;
  }> {
    const user = await this.prisma.adminUser.findFirst({
      where: {
        email: email.toLowerCase(),
        deletedAt: null,
        active: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid admin credentials');
    }
    const ok = await bcryptCompare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid admin credentials');
    }
    const admin: AdminPrincipal = {
      id: user.id,
      email: user.email,
      role: 'ADMIN',
    };
    const accessToken = signAdminJwt({
      sub: admin.id,
      email: admin.email,
      role: admin.role,
    });
    return { accessToken, admin };
  }

  async me(adminId: string): Promise<AdminPrincipal> {
    const user = await this.prisma.adminUser.findFirst({
      where: { id: adminId, deletedAt: null, active: true },
    });
    if (!user) {
      throw new UnauthorizedException('Admin not found');
    }
    return { id: user.id, email: user.email, role: 'ADMIN' };
  }
}
