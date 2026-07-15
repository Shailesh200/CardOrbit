import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const ALGO = 'aes-256-gcm';

function resolveKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY?.trim();
  if (raw) {
    const fromB64 = Buffer.from(raw, 'base64');
    if (fromB64.length === 32) return fromB64;
    return createHash('sha256').update(raw).digest();
  }
  const fallback = process.env.JWT_ACCESS_SECRET || 'change-me-use-openssl-rand-base64-32';
  return createHash('sha256').update(`cardwise-token-enc:${fallback}`).digest();
}

/** Encrypts a secret string; returns `iv:tag:ciphertext` (all base64). */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, resolveKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(':');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Invalid encrypted secret payload');
  }
  const decipher = createDecipheriv(ALGO, resolveKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
