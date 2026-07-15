import { describe, expect, it } from 'vitest';

import { PasswordSchema, safeParsePassword } from './password';

describe('PasswordSchema', () => {
  it('accepts strong passwords', () => {
    expect(safeParsePassword('Str0ng!Passw0rd').success).toBe(true);
  });

  it('rejects weak passwords', () => {
    expect(PasswordSchema.safeParse('short').success).toBe(false);
    expect(PasswordSchema.safeParse('nouppercase1!').success).toBe(false);
    expect(PasswordSchema.safeParse('NOLOWERCASE1!').success).toBe(false);
    expect(PasswordSchema.safeParse('NoNumber!!!!').success).toBe(false);
    expect(PasswordSchema.safeParse('NoSymbol12345').success).toBe(false);
  });
});
