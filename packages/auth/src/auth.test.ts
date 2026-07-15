import { describe, expect, it } from 'vitest';

import { PasswordSchema } from './index';

describe('@cardwise/auth', () => {
  it('re-exports password schema', () => {
    expect(PasswordSchema.safeParse('Weak').success).toBe(false);
    expect(PasswordSchema.safeParse('Str0ng!Passw0rd').success).toBe(true);
  });
});
