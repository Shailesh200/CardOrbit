import type { GenerateContentResponse } from '@google/genai';
import type { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { getGeminiClient } from './client';

export type GeminiUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

function mapUsage(response: GenerateContentResponse): GeminiUsage {
  const usage = response.usageMetadata;
  return {
    inputTokens: usage?.promptTokenCount,
    outputTokens: usage?.candidatesTokenCount,
    totalTokens: usage?.totalTokenCount,
  };
}

function buildContents(prompt: string): string {
  return prompt;
}

function parseStructuredJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
    if (fenced) {
      return JSON.parse(fenced) as unknown;
    }

    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1)) as unknown;
    }

    throw new Error('Gemini returned invalid structured JSON');
  }
}

export async function geminiGenerateStructured<T extends z.ZodTypeAny>(options: {
  schema: T;
  system: string;
  prompt: string;
  model: string;
  maxOutputTokens?: number;
  temperature?: number;
}): Promise<{ data: z.infer<T>; text: string; usage: GeminiUsage }> {
  const client = getGeminiClient();
  const response = await client.models.generateContent({
    model: options.model,
    contents: buildContents(options.prompt),
    config: {
      systemInstruction: options.system,
      responseMimeType: 'application/json',
      responseJsonSchema: zodToJsonSchema(options.schema, { $refStrategy: 'none' }),
      maxOutputTokens: options.maxOutputTokens ?? 4096,
      ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
    },
  });

  const text = response.text?.trim() ?? '';
  if (!text) {
    throw new Error('Gemini returned an empty structured response');
  }

  const parsed = options.schema.parse(parseStructuredJson(text));
  return { data: parsed, text, usage: mapUsage(response) };
}

export async function geminiGeneratePlainText(options: {
  system?: string;
  prompt: string;
  model: string;
  maxOutputTokens?: number;
  temperature?: number;
}): Promise<{ text: string; usage: GeminiUsage }> {
  const client = getGeminiClient();
  const response = await client.models.generateContent({
    model: options.model,
    contents: buildContents(options.prompt),
    config: {
      ...(options.system ? { systemInstruction: options.system } : {}),
      maxOutputTokens: options.maxOutputTokens ?? 256,
      ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
    },
  });

  const text = response.text?.trim() ?? '';
  if (!text) {
    throw new Error('Gemini returned an empty text response');
  }

  return { text, usage: mapUsage(response) };
}

/** Streaming text generation — available for future assistant UX. */
export async function geminiGeneratePlainTextStream(options: {
  system?: string;
  prompt: string;
  model: string;
  maxOutputTokens?: number;
  temperature?: number;
  onChunk: (chunk: string) => void;
}): Promise<{ text: string; usage: GeminiUsage }> {
  const client = getGeminiClient();
  const stream = await client.models.generateContentStream({
    model: options.model,
    contents: buildContents(options.prompt),
    config: {
      ...(options.system ? { systemInstruction: options.system } : {}),
      maxOutputTokens: options.maxOutputTokens ?? 256,
      ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
    },
  });

  let text = '';
  let lastResponse: GenerateContentResponse | undefined;

  for await (const chunk of stream) {
    lastResponse = chunk;
    const piece = chunk.text ?? '';
    if (piece) {
      text += piece;
      options.onChunk(piece);
    }
  }

  return {
    text: text.trim(),
    usage: lastResponse ? mapUsage(lastResponse) : {},
  };
}
