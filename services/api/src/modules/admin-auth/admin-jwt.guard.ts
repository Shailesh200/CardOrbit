import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';

import type { AdminJwtPayload, AdminPrincipal } from './admin-auth.types';

type FastifyRequestLike = {
  headers: Record<string, string | string[] | undefined>;
  adminUser?: AdminPrincipal;
};

function b64urlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function parseB64urlJson<T>(value: string): T {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T;
}

export function getAdminJwtSecret(): string {
  return process.env.ADMIN_JWT_SECRET || 'change-me-admin-jwt-secret';
}

export function signAdminJwt(
  payload: Omit<AdminJwtPayload, 'typ'> & { typ?: 'admin' },
  expiresInSeconds = 60 * 60 * 8,
): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const body: AdminJwtPayload = {
    ...payload,
    typ: 'admin',
  };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...body, iat: now, exp: now + expiresInSeconds };
  const unsigned = `${b64urlJson(header)}.${b64urlJson(fullPayload)}`;
  const signature = createHmac('sha256', getAdminJwtSecret()).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}

export function verifyAdminJwt(token: string): AdminJwtPayload {
  const parts = token.split('.');
  const header = parts[0];
  const body = parts[1];
  const signature = parts[2];
  if (!header || !body || !signature) {
    throw new UnauthorizedException('Invalid admin token');
  }
  const unsigned = `${header}.${body}`;
  const expected = createHmac('sha256', getAdminJwtSecret()).update(unsigned).digest('base64url');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new UnauthorizedException('Invalid admin token signature');
  }
  const payload = parseB64urlJson<AdminJwtPayload & { exp?: number }>(body);
  if (payload.typ !== 'admin') {
    throw new UnauthorizedException('Consumer tokens cannot access admin routes');
  }
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new UnauthorizedException('Admin token expired');
  }
  return payload;
}

@Injectable()
export class AdminJwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<FastifyRequestLike & { query?: Record<string, string> }>();
    const header = request.headers.authorization;
    const value = Array.isArray(header) ? header[0] : header;
    const queryToken = request.query?.access_token;
    const raw = value?.startsWith('Bearer ')
      ? value.slice('Bearer '.length).trim()
      : queryToken?.trim();
    if (!raw) {
      throw new UnauthorizedException('Missing admin bearer token');
    }
    const payload = verifyAdminJwt(raw);
    request.adminUser = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    return true;
  }
}
