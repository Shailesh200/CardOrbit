import { JobRunStatus, type PrismaClient } from '@prisma/client';

export class JobCancelledError extends Error {
  constructor(message = 'Sync cancelled by operator') {
    super(message);
    this.name = 'JobCancelledError';
  }
}

/** Throws when the operator cancelled the background job run. */
export async function assertJobActive(
  prisma: PrismaClient,
  jobRunId: string | undefined,
): Promise<void> {
  if (!jobRunId) return;

  const row = await prisma.jobRun.findUnique({
    where: { id: jobRunId },
    select: { status: true },
  });

  if (row?.status === JobRunStatus.CANCELLED) {
    throw new JobCancelledError();
  }
}
