import { createHmac, timingSafeEqual } from 'node:crypto';

export type OAuthIntent = 'login' | 'link_mailbox';

export type OAuthStatePayload = {
  intent: OAuthIntent;
  userId?: string;
  exp: number;
};

function stateSecret(): string {
  return process.env.JWT_ACCESS_SECRET || 'change-me-use-openssl-rand-base64-32';
}

function toBase64Url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64url');
}

function fromBase64Url(input: string): Buffer {
  return Buffer.from(input, 'base64url');
}

export function signOAuthState(input: { intent: OAuthIntent; userId?: string }): string {
  const payload: OAuthStatePayload = {
    intent: input.intent,
    userId: input.userId,
    exp: Date.now() + 15 * 60 * 1000,
  };
  const body = toBase64Url(JSON.stringify(payload));
  const sig = createHmac('sha256', stateSecret()).update(body).digest();
  return `${body}.${toBase64Url(sig)}`;
}

export function verifyOAuthState(raw: string | undefined): OAuthStatePayload {
  if (!raw || !raw.includes('.')) {
    return { intent: 'login', exp: Date.now() + 1 };
  }
  const [body, sigB64] = raw.split('.');
  if (!body || !sigB64) {
    throw new Error('Invalid OAuth state');
  }
  const expected = createHmac('sha256', stateSecret()).update(body).digest();
  const actual = fromBase64Url(sigB64);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new Error('Invalid OAuth state signature');
  }
  const payload = JSON.parse(fromBase64Url(body).toString('utf8')) as OAuthStatePayload;
  if (!payload.exp || payload.exp < Date.now()) {
    throw new Error('OAuth state expired');
  }
  if (payload.intent !== 'login' && payload.intent !== 'link_mailbox') {
    throw new Error('Unknown OAuth intent');
  }
  if (payload.intent === 'link_mailbox' && !payload.userId) {
    throw new Error('link_mailbox state missing userId');
  }
  return payload;
}
