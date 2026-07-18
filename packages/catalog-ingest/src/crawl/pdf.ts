import { inflateSync, inflateRawSync } from 'node:zlib';

import { fetchPdf } from './http';

const MAX_PDF_TEXT_CHARS = 20_000;
const STREAM_PATTERN = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
const LITERAL_TEXT_PATTERN = /\(((?:[^()\\]|\\.)*)\)\s*Tj/g;
const ARRAY_TEXT_PATTERN = /\[((?:[^[\]\\]|\\.)*)\]\s*TJ/g;
const ARRAY_STRING_PATTERN = /\(((?:[^()\\]|\\.)*)\)/g;

function decodePdfLiteralString(raw: string): string {
  return raw
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\(\d{1,3})/g, (_match, octal: string) => String.fromCharCode(parseInt(octal, 8)))
    .replace(/\\\\/g, '\\');
}

function inflateStream(body: Buffer): Buffer {
  try {
    return inflateSync(body);
  } catch {
    try {
      return inflateRawSync(body);
    } catch {
      return body;
    }
  }
}

function extractTextOperators(contentStream: string): string {
  const chunks: string[] = [];

  for (const match of contentStream.matchAll(LITERAL_TEXT_PATTERN)) {
    if (match[1]) chunks.push(decodePdfLiteralString(match[1]));
  }

  for (const match of contentStream.matchAll(ARRAY_TEXT_PATTERN)) {
    const inner = match[1] ?? '';
    for (const strMatch of inner.matchAll(ARRAY_STRING_PATTERN)) {
      if (strMatch[1]) chunks.push(decodePdfLiteralString(strMatch[1]));
    }
  }

  return chunks.join(' ');
}

/**
 * Minimal, dependency-free PDF text extractor: inflates FlateDecode content streams
 * (the common case for text-based PDFs) and pulls literal string operands out of
 * `Tj` / `TJ` text-showing operators. This is not a general-purpose PDF parser — it is
 * "good enough" to pull earn-rate / fee sentences out of simple issuer MITC and T&C
 * PDFs for secondary-evidence use, and safely returns an empty string on anything it
 * can't handle (scanned/image-only PDFs, exotic encodings, etc).
 */
export function extractPdfText(buffer: Buffer): string {
  const raw = buffer.toString('latin1');
  const texts: string[] = [];

  for (const match of raw.matchAll(STREAM_PATTERN)) {
    const streamBody = Buffer.from(match[1] ?? '', 'latin1');
    const decoded = inflateStream(streamBody).toString('latin1');
    if (!/\bTj\b|\bTJ\b/.test(decoded)) continue;

    const text = extractTextOperators(decoded).trim();
    if (text) texts.push(text);
  }

  return texts
    .join('\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim()
    .slice(0, MAX_PDF_TEXT_CHARS);
}

export async function fetchAndExtractPdfText(
  url: string,
  timeoutMs = 30_000,
  referer?: string,
): Promise<{ text: string; finalUrl: string }> {
  const { buffer, finalUrl } = await fetchPdf(url, timeoutMs, referer);
  return { text: extractPdfText(buffer), finalUrl };
}
