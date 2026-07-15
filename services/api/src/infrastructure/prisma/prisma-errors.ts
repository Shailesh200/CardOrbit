import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/** Maps Prisma unique constraint violations to HTTP 409 with a readable message. */
export function rethrowPrismaUnique(error: unknown, entityLabel: string, field = 'slug'): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new ConflictException(
      `${entityLabel} with this ${field} already exists. Edit the existing row instead of creating a duplicate.`,
    );
  }
  throw error;
}
