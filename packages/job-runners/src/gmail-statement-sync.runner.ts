import { createDecipheriv, createHash } from 'node:crypto';

import type { PrismaClient } from '@prisma/client';
import type { GmailStatementSyncPayload, GmailStatementSyncResult } from '@cardwise/jobs';

import { parseGmailTransactionAlert } from './gmail-transaction-parser';

type ProgressFn = (progress: {
  message: string;
  messagesScanned?: number;
  messagesProcessed?: number;
  transactionsCreated?: number;
}) => Promise<void>;

type PortfolioCard = {
  id: string;
  bankName: string;
  bankSlug: string;
  cardName: string;
};

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

function decryptSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(':');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Invalid encrypted secret payload');
  }
  const decipher = createDecipheriv('aes-256-gcm', resolveKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth is not configured on the worker');
  }
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!tokenRes.ok) {
    throw new Error(`Google token refresh failed (${tokenRes.status})`);
  }
  const json = (await tokenRes.json()) as { access_token?: string };
  if (!json.access_token) throw new Error('Missing access_token from Google refresh');
  return json.access_token;
}

function decodeBase64Url(data: string): string {
  const padded = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(padded, 'base64').toString('utf8');
}

type GmailPart = {
  mimeType?: string;
  body?: { data?: string; size?: number };
  parts?: GmailPart[];
};

function collectTextParts(part: GmailPart | undefined, out: string[]): void {
  if (!part) return;
  if (part.body?.data && (part.mimeType === 'text/plain' || part.mimeType === 'text/html')) {
    const decoded = decodeBase64Url(part.body.data);
    out.push(part.mimeType === 'text/html' ? decoded.replace(/<[^>]+>/g, ' ') : decoded);
  }
  for (const child of part.parts ?? []) {
    collectTextParts(child, out);
  }
}

async function fetchMessageText(
  accessToken: string,
  messageId: string,
): Promise<{ text: string; internalDate: Date }> {
  const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`);
  url.searchParams.set('format', 'full');
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    throw new Error(`Gmail message fetch failed (${res.status})`);
  }
  const json = (await res.json()) as {
    snippet?: string;
    internalDate?: string;
    payload?: GmailPart;
  };
  const parts: string[] = [];
  if (json.snippet) parts.push(json.snippet);
  collectTextParts(json.payload, parts);
  const internalDate = json.internalDate
    ? new Date(Number(json.internalDate))
    : new Date();
  return { text: parts.join('\n'), internalDate };
}

function pickUserCard(
  cards: PortfolioCard[],
  options: { preferredUserCardId?: string; bankHint: string | null },
): PortfolioCard | null {
  if (cards.length === 0) return null;
  if (options.preferredUserCardId) {
    const preferred = cards.find((card) => card.id === options.preferredUserCardId);
    if (preferred) return preferred;
  }
  if (options.bankHint) {
    const hint = options.bankHint.toLowerCase();
    const byBank = cards.find(
      (card) =>
        card.bankSlug.toLowerCase().includes(hint) ||
        card.bankName.toLowerCase().includes(hint) ||
        card.cardName.toLowerCase().includes(hint),
    );
    if (byBank) return byBank;
  }
  return cards[0] ?? null;
}

/** When a bank alert arrives for a bank not yet in the portfolio, add one catalog card. */
async function ensureCardForBankHint(
  prisma: PrismaClient,
  userId: string,
  bankHint: string,
  cards: PortfolioCard[],
): Promise<{ card: PortfolioCard | null; added: boolean }> {
  const existing = pickUserCard(cards, { bankHint, preferredUserCardId: undefined });
  if (existing) return { card: existing, added: false };

  const hint = bankHint.toLowerCase();
  const creditCard = await prisma.creditCard.findFirst({
    where: {
      deletedAt: null,
      active: true,
      bank: {
        OR: [
          { slug: { equals: hint, mode: 'insensitive' } },
          { slug: { contains: hint, mode: 'insensitive' } },
          { name: { contains: hint, mode: 'insensitive' } },
        ],
      },
    },
    include: { bank: true },
    orderBy: [{ name: 'asc' }],
  });
  if (!creditCard) return { card: null, added: false };

  try {
    const created = await prisma.userCard.create({
      data: {
        userId,
        creditCardId: creditCard.id,
        status: 'ACTIVE',
        nickname: `${creditCard.bank.name} (from Gmail)`,
      },
      include: { creditCard: { include: { bank: true } } },
    });
    const card: PortfolioCard = {
      id: created.id,
      bankName: created.creditCard.bank.name,
      bankSlug: created.creditCard.bank.slug,
      cardName: created.nickname ?? created.creditCard.name,
    };
    cards.push(card);
    return { card, added: true };
  } catch {
    const existingRow = await prisma.userCard.findUnique({
      where: { userId_creditCardId: { userId, creditCardId: creditCard.id } },
      include: { creditCard: { include: { bank: true } } },
    });
    if (!existingRow) return { card: null, added: false };
    if (existingRow.status === 'REMOVED') {
      const restored = await prisma.userCard.update({
        where: { id: existingRow.id },
        data: { status: 'ACTIVE', removedAt: null, nickname: `${creditCard.bank.name} (from Gmail)` },
        include: { creditCard: { include: { bank: true } } },
      });
      const card: PortfolioCard = {
        id: restored.id,
        bankName: restored.creditCard.bank.name,
        bankSlug: restored.creditCard.bank.slug,
        cardName: restored.nickname ?? restored.creditCard.name,
      };
      cards.push(card);
      return { card, added: true };
    }
    const card: PortfolioCard = {
      id: existingRow.id,
      bankName: existingRow.creditCard.bank.name,
      bankSlug: existingRow.creditCard.bank.slug,
      cardName: existingRow.nickname ?? existingRow.creditCard.name,
    };
    if (!cards.some((row) => row.id === card.id)) cards.push(card);
    return { card, added: false };
  }
}

/**
 * Sync credit-card transaction alerts from Gmail into the user's transaction timeline.
 */
export async function runGmailStatementSync(
  prisma: PrismaClient,
  payload: GmailStatementSyncPayload,
  onProgress?: ProgressFn,
): Promise<GmailStatementSyncResult> {
  const mailbox = await prisma.mailSyncMailbox.findFirst({
    where: { id: payload.mailboxId, userId: payload.userId, status: 'ACTIVE' },
  });
  if (!mailbox) {
    throw new Error('Mailbox not found or inactive');
  }

  const portfolio = await prisma.userCard.findMany({
    where: { userId: payload.userId, status: { not: 'REMOVED' } },
    include: {
      creditCard: { include: { bank: true } },
    },
  });
  const cards: PortfolioCard[] = portfolio.map((row) => ({
    id: row.id,
    bankName: row.creditCard.bank.name,
    bankSlug: row.creditCard.bank.slug,
    cardName: row.nickname ?? row.creditCard.name,
  }));

  await onProgress?.({
    message:
      cards.length === 0
        ? 'No portfolio cards yet — will detect banks from Gmail alerts'
        : 'Refreshing Google access token',
  });

  await onProgress?.({ message: 'Refreshing Google access token' });

  let accessToken: string;
  try {
    const refreshToken = decryptSecret(mailbox.encryptedRefreshToken);
    accessToken = await refreshAccessToken(refreshToken);
  } catch (error) {
    await prisma.mailSyncMailbox.update({
      where: { id: mailbox.id },
      data: {
        status: 'NEEDS_REAUTH',
        lastSyncError: error instanceof Error ? error.message : 'Token refresh failed',
      },
    });
    throw error;
  }

  await onProgress?.({ message: 'Searching Gmail for card transactions' });

  // Alert-only: exclude statement/bill subjects so due amounts are not imported as spends.
  const query = [
    '(',
    'subject:spent OR subject:debited OR subject:transaction OR subject:"credit card"',
    'OR "spent on your" OR "debited from" OR "transaction of" OR "paid using"',
    ')',
    '(credit OR card OR hdfc OR icici OR sbi OR axis OR amex OR kotak OR rbl OR idfc)',
    '-subject:statement -subject:"e-statement" -subject:"account statement" -"amount due" -"minimum due"',
    'newer_than:90d',
  ].join(' ');

  const listUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
  listUrl.searchParams.set('q', query);
  listUrl.searchParams.set('maxResults', '40');

  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!listRes.ok) {
    const errText = await listRes.text();
    const message = `Gmail list failed (${listRes.status}): ${errText.slice(0, 200)}`;
    await prisma.mailSyncMailbox.update({
      where: { id: mailbox.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncError: message,
        status: listRes.status === 401 || listRes.status === 403 ? 'NEEDS_REAUTH' : 'ACTIVE',
      },
    });
    throw new Error(message);
  }

  const listJson = (await listRes.json()) as { messages?: Array<{ id: string }> };
  const messageIds = (listJson.messages ?? []).map((row) => row.id);
  const messagesScanned = messageIds.length;

  await onProgress?.({
    message: `Found ${messagesScanned} candidate message(s)`,
    messagesScanned,
    transactionsCreated: 0,
  });

  let transactionsCreated = 0;
  let messagesProcessed = 0;
  let parseFailures = 0;
  let cardsAutoAdded = 0;

  for (const messageId of messageIds) {
    messagesProcessed += 1;
    try {
      const { text, internalDate } = await fetchMessageText(accessToken, messageId);
      const parsed = parseGmailTransactionAlert(text, { fallbackDate: internalDate });
      if (!parsed) {
        parseFailures += 1;
        continue;
      }

      let card = pickUserCard(cards, {
        preferredUserCardId: payload.userCardId,
        bankHint: parsed.bankHint,
      });
      if (!card && parsed.bankHint) {
        const ensured = await ensureCardForBankHint(
          prisma,
          payload.userId,
          parsed.bankHint,
          cards,
        );
        card = ensured.card;
        if (ensured.added) cardsAutoAdded += 1;
      }
      if (!card) continue;

      const externalRef = `gmail:${messageId}`;
      const existing = await prisma.transaction.findUnique({
        where: { userId_externalRef: { userId: payload.userId, externalRef } },
        select: { id: true },
      });
      if (existing) continue;

      await prisma.transaction.create({
        data: {
          userId: payload.userId,
          userCardId: card.id,
          amountInr: parsed.amountInr,
          merchantName: parsed.merchantName,
          categorySlug: 'other',
          status: 'POSTED',
          source: 'GMAIL_SYNC',
          externalRef,
          notes: `Imported from Gmail · ${parsed.rawSnippet.slice(0, 160)}`,
          tags: ['gmail-sync'],
          transactedAt: parsed.transactedAt,
        },
      });
      transactionsCreated += 1;
    } catch {
      parseFailures += 1;
    }

    if (messagesProcessed % 5 === 0 || messagesProcessed === messagesScanned) {
      await onProgress?.({
        message: `Processed ${messagesProcessed}/${messagesScanned} · imported ${transactionsCreated}`,
        messagesScanned,
        messagesProcessed,
        transactionsCreated,
      });
    }
  }

  await prisma.mailSyncMailbox.update({
    where: { id: mailbox.id },
    data: {
      lastSyncAt: new Date(),
      lastSyncError: null,
      status: 'ACTIVE',
    },
  });

  const parts: string[] = [];
  if (cardsAutoAdded > 0) {
    parts.push(
      `Added ${cardsAutoAdded} card${cardsAutoAdded === 1 ? '' : 's'} from bank alerts`,
    );
  }
  if (transactionsCreated > 0) {
    parts.push(
      `imported ${transactionsCreated} transaction${transactionsCreated === 1 ? '' : 's'}`,
    );
  }
  const note =
    messagesScanned === 0
      ? 'No recent card transaction emails matched.'
      : parts.length > 0
        ? `${parts.join(' · ')} from Gmail.`
        : parseFailures === messagesScanned
          ? 'Messages found, but none looked like parseable card spends. Forward bank alerts to this inbox or import a CSV.'
          : 'No new transactions to import (duplicates skipped or unmatched banks).';

  return {
    messagesScanned,
    transactionsCreated,
    cardsAutoAdded,
    note,
  };
}
