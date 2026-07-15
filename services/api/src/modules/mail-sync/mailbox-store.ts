import type { PrismaClient } from '@prisma/client';

import { decryptSecret, encryptSecret } from '../../infrastructure/crypto/token-crypto';

export type UpsertMailboxInput = {
  userId: string;
  email: string;
  googleSub: string;
  refreshToken: string | null;
  scopes: string[];
  isPrimary: boolean;
};

export async function upsertMailSyncMailbox(
  prisma: PrismaClient,
  input: UpsertMailboxInput,
): Promise<{ id: string; email: string }> {
  const email = input.email.trim().toLowerCase();
  const existingBySub = await prisma.mailSyncMailbox.findUnique({
    where: { googleSub: input.googleSub },
  });
  if (existingBySub && existingBySub.userId !== input.userId) {
    throw new Error('This Google account is already linked to another CardWise user');
  }

  const existing = await prisma.mailSyncMailbox.findUnique({
    where: { userId_email: { userId: input.userId, email } },
  });

  const encryptedRefreshToken =
    input.refreshToken != null
      ? encryptSecret(input.refreshToken)
      : existing?.encryptedRefreshToken;

  if (!encryptedRefreshToken) {
    throw new Error('Google did not return a refresh token — reconnect with consent');
  }

  if (input.isPrimary) {
    await prisma.mailSyncMailbox.updateMany({
      where: { userId: input.userId, isPrimary: true, NOT: { email } },
      data: { isPrimary: false },
    });
  }

  const row = await prisma.mailSyncMailbox.upsert({
    where: { userId_email: { userId: input.userId, email } },
    create: {
      userId: input.userId,
      email,
      googleSub: input.googleSub,
      encryptedRefreshToken,
      scopes: input.scopes,
      isPrimary: input.isPrimary,
      status: 'ACTIVE',
      lastSyncError: null,
    },
    update: {
      googleSub: input.googleSub,
      encryptedRefreshToken,
      scopes: input.scopes.length > 0 ? input.scopes : undefined,
      isPrimary: input.isPrimary || undefined,
      status: 'ACTIVE',
      lastSyncError: null,
    },
  });

  return { id: row.id, email: row.email };
}

export function readMailboxRefreshToken(encryptedRefreshToken: string): string {
  return decryptSecret(encryptedRefreshToken);
}
