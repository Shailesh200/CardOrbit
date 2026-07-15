import { createHash, randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import type { AuthTokenPair, ConsumerJwtPayload, ConsumerPrincipal } from './auth.types';

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

function parseDurationToSeconds(value: string, fallbackSeconds: number): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) {
    return fallbackSeconds;
  }
  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return amount * (multipliers[unit!] ?? 1);
}

@Injectable()
export class AuthTokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  accessExpiresInSeconds(): number {
    return parseDurationToSeconds(process.env.JWT_ACCESS_EXPIRY || '15m', 15 * 60);
  }

  refreshExpiresInSeconds(): number {
    return parseDurationToSeconds(process.env.JWT_REFRESH_EXPIRY || '7d', 7 * 86400);
  }

  async issueTokenPair(user: ConsumerPrincipal): Promise<AuthTokenPair> {
    const expiresIn = this.accessExpiresInSeconds();
    const payload: ConsumerJwtPayload = {
      sub: user.id,
      email: user.email,
      role: 'USER',
      typ: 'consumer',
    };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.accessSecret(),
      expiresIn,
    });

    const refreshToken = randomBytes(48).toString('base64url');
    const refreshSeconds = this.refreshExpiresInSeconds();
    await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + refreshSeconds * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn,
    };
  }

  accessSecret(): string {
    return process.env.JWT_ACCESS_SECRET || 'change-me-use-openssl-rand-base64-32';
  }

  hash(raw: string): string {
    return hashToken(raw);
  }

  async rotateRefreshToken(rawRefreshToken: string): Promise<AuthTokenPair> {
    const tokenHash = hashToken(rawRefreshToken);
    const session = await this.prisma.session.findFirst({
      where: { tokenHash, revokedAt: null },
      include: { user: true },
    });
    if (!session || session.expiresAt.getTime() < Date.now()) {
      throw new Error('INVALID_REFRESH');
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokenPair({
      id: session.user.id,
      email: session.user.email,
      role: 'USER',
    });
  }

  async revokeRefreshToken(rawRefreshToken: string): Promise<void> {
    const tokenHash = hashToken(rawRefreshToken);
    await this.prisma.session.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  createOpaqueToken(): string {
    return randomBytes(32).toString('base64url');
  }
}
