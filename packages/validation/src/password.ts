import { z } from 'zod';

export const PasswordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[0-9]/, 'Password must include a number')
  .regex(/[^A-Za-z0-9]/, 'Password must include a symbol');

export type Password = z.infer<typeof PasswordSchema>;

export function parsePassword(input: unknown): Password {
  return PasswordSchema.parse(input);
}

export function safeParsePassword(input: unknown) {
  return PasswordSchema.safeParse(input);
}
