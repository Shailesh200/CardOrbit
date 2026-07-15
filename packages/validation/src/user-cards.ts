import { z } from 'zod';

export const AddUserCardSchema = z.object({
  creditCardId: z.string().uuid(),
  nickname: z.string().trim().min(1).max(80).optional(),
});

export type AddUserCardInput = z.infer<typeof AddUserCardSchema>;

export const PatchUserCardSchema = z.object({
  nickname: z.string().trim().min(1).max(80).optional().nullable(),
  isFavorite: z.boolean().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  statementDay: z.number().int().min(1).max(31).nullable().optional(),
  dueDay: z.number().int().min(1).max(31).nullable().optional(),
});

export type PatchUserCardInput = z.infer<typeof PatchUserCardSchema>;

export function parseAddUserCardInput(value: unknown): AddUserCardInput {
  return AddUserCardSchema.parse(value);
}

export function parsePatchUserCardInput(value: unknown): PatchUserCardInput {
  return PatchUserCardSchema.parse(value);
}
