import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import type { ConsumerJwtPayload, ConsumerPrincipal } from './auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'consumer-jwt') {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET || 'change-me-use-openssl-rand-base64-32',
    });
  }

  async validate(payload: ConsumerJwtPayload): Promise<ConsumerPrincipal> {
    if (payload.typ !== 'consumer') {
      throw new UnauthorizedException('Admin tokens cannot access consumer routes');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, accountStatus: true },
    });

    if (!user || user.accountStatus !== 'ACTIVE') {
      throw new UnauthorizedException('Session invalid — please sign in again');
    }

    return {
      id: user.id,
      email: user.email,
      role: 'USER',
    };
  }
}
