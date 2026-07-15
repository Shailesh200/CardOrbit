import { z } from 'zod';

export const JobRunStatusSchema = z.enum([
  'QUEUED',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
]);

export type JobRunStatus = z.infer<typeof JobRunStatusSchema>;

export type JobDefinition<TPayload extends z.ZodTypeAny, _TProgress, _TResult> = {
  type: string;
  queue: string;
  description: string;
  estimatedMinutes?: { min: number; max: number };
  payloadSchema: TPayload;
  defaultPayload?: z.infer<TPayload>;
};

export type JobProgressEvent = {
  jobId: string;
  status: JobRunStatus;
  progress?: Record<string, unknown> | null;
  result?: Record<string, unknown> | null;
  errorMessage?: string | null;
};

export function jobChannel(jobId: string): string {
  return `cardwise:job:${jobId}`;
}
